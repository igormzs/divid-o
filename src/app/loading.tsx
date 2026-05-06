import styles from './page.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className="skeleton" style={{ height: '32px', width: '150px' }} />
          <div className="skeleton" style={{ height: '40px', width: '120px', borderRadius: '24px' }} />
        </div>
        <div className={styles.searchBar} style={{ border: 'none', background: 'transparent' }}>
          <div className="skeleton" style={{ height: '48px', width: '100%', borderRadius: '16px' }} />
        </div>
      </header>

      <div className={styles.balanceSummary} style={{ border: 'none', background: 'transparent' }}>
        <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '24px' }} />
      </div>

      <div className={styles.friendsList}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={styles.friendItem}>
            <div className={`${styles.friendAvatar} skeleton`} />
            <div className={styles.friendDetails} style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: '18px', width: '60%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
