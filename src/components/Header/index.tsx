import Link from 'next/link';
import styles from './header.module.scss';

export default function Header(): JSX.Element {
  return (
    <header className={styles.headerContainer} data-testid="logo">
      <div className={styles.headerContent}>
        <Link href="/">
          <img alt="logo" src="/images/logo.svg" />
        </Link>
      </div>
    </header>
  );
}
