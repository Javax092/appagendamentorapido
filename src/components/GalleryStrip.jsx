import postBeard from "../assets/post-beard.svg";
import postClassic from "../assets/post-classic.svg";
import postFade from "../assets/post-fade.svg";

const postImageMap = {
  "post-fade": postFade,
  "post-beard": postBeard,
  "post-classic": postClassic
};

export function GalleryStrip({ galleryPosts }) {
  return (
    <section className="gallery-strip">
      <div className="section-head">
        <div>
          <span className="mini-badge">Visual</span>
          <h2>Posts e cortes em destaque</h2>
        </div>
        <p>Area pronta para mostrar trabalhos, logo, detalhes do ambiente e fortalecer a marca do cliente.</p>
      </div>

      <div className="gallery-grid">
        {galleryPosts.map((post) => (
          <article key={post.id} className="gallery-card">
            <img src={post.imageUrl || postImageMap[post.imageKey]} alt={post.title} />
            <div className="gallery-copy">
              <span className="tag">{post.tag}</span>
              <strong>{post.title}</strong>
              <p>{post.caption}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
