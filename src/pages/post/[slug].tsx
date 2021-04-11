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
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import Header from '../../components/Header';
import Comments from '../../components/Comments';
import common from '../../styles/common.module.scss';

/**
 * TYPES
 */
interface Post {
  first_publication_date: string | null;
  lastEdition: string | null;
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

interface Navigation {
  prevPost: {
    uid: string | null;
    title: string;
  };
  nextPost: {
    uid: string | null;
    title: string;
  };
}

interface PostProps {
  post: Post;
  navigation: Navigation;
  preview: boolean;
}

/**
 * EXPORTS
 */
export default function Post(props: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const { post, navigation, preview } = props;

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
            <span className={`${styles.infoItem} ${styles.edition}`}>
              * editado em
              {format(
                new Date(post.first_publication_date),
                ' dd MMM yyyy, hh:mm',
                {
                  locale: ptBR,
                }
              )}
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
          <footer className={styles.footerContainer}>
            {navigation.prevPost && (
              <div>
                <span>{navigation.prevPost.uid}</span>
                <Link href={`/post/${navigation.prevPost.uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}
            {navigation.nextPost && (
              <div className={styles.nextPost}>
                <span>{navigation.nextPost.title}</span>
                <Link href={`/post/${navigation.nextPost.uid}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
            )}
          </footer>
          <Comments />
          {preview && (
            <Link href="/api/exit-preview">
              <a className={common.exitPreviewButtonContainer}>
                Sair do modo preview
              </a>
            </Link>
          )}
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

  // get the paths we want to pre-render based on posts
  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));
  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
  params,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    lang: 'pt-br',
    ref: previewData?.ref ?? null,
  });

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const prevUid =
    prevPost?.results.length > 0
      ? {
          uid: prevPost?.results[0].uid,
          title: prevPost?.results[0].data.title,
        }
      : null;
  const nextUid =
    nextPost?.results.length > 0
      ? {
          uid: nextPost?.results[0].uid,
          title: nextPost?.results[0].data.title,
        }
      : null;

  const post: Post = {
    first_publication_date: response.first_publication_date,
    lastEdition: response.last_publication_date,
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
    props: {
      post,
      navigation: {
        prevPost: prevUid,
        nextPost: nextUid,
      },
      preview,
    },
    revalidate: 60 * 60 * 2, // 2 hours
  };
};
