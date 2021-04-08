/**
 * IMPORTS
 */
// eslint-disable-next-line no-use-before-define
import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { RichText } from 'prismic-dom';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import Header from '../../components/Header';

/**
 * TYPES
 */
interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

/**
 * EXPORTS
 */
export default function Post(props: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const { post } = props;

  const words = post.data.content.reduce((acc, item) => {
    const w = RichText.asText(item.body).split(' ').length;
    const h = item.heading.split(' ').length;
    return acc + w + h;
  }, 0);

  return (
    <>
      <Head>
        <title>{post?.data.title} | Spacetraveling</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <img src={post?.data.banner.url} alt="banner" />
        <main className={styles.contentContainer}>
          <h1>{post?.data.title}</h1>
          <div>
            <time className={styles.infoItem}>
              <FiCalendar />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <span className={styles.infoItem}>
              <FiUser />
              {post?.data.author}
            </span>
            <span className={styles.infoItem} data-testid="time">
              <FiClock />
              {Math.ceil(words / 200)} min
            </span>
          </div>
          <section>
            {post?.data.content.map(section => (
              <React.Fragment key={section.heading}>
                <strong>{section.heading}</strong>
                <p
                  dangerouslySetInnerHTML={{
                    __html: RichText.asText(section.body),
                  }}
                />
              </React.Fragment>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author', 'posts.content'],
    }
  );

  // Get the paths we want to pre-render based on posts
  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));
  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    lang: 'pt-br',
  });

  const post: Post = {
    first_publication_date: response.first_publication_date,
    ...response,
    data: {
      ...response.data,
      author: response.data.author,
      banner: response.data.banner,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: [...item.body],
        };
      }),
      title: response.data.title,
    },
  };

  return {
    props: { post },
  };
};
