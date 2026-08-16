export function SiteFooter({ title, description }: { title: string; description: string | null }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>
          © {new Date().getFullYear()} {title}
        </span>
        {description ? <p>{description}</p> : null}
      </div>
    </footer>
  );
}