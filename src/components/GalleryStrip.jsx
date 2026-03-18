import postBeard from "../assets/post-beard.svg";
import postClassic from "../assets/post-classic.svg";
import postFade from "../assets/post-fade.svg";

const fallbackGalleryImages = ["/paion2.png", "/paitaon.png", postFade, postBeard, postClassic];

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
          <h2>Destaques da barbearia</h2>
        </div>
        <p>Imagem forte, marca clara e cortes em evidencia.</p>
      </div>

      <div className="gallery-grid">
        {galleryPosts.map((post, index) => (
          <article key={post.id} className="gallery-card">
            <img src={post.imageUrl || postImageMap[post.imageKey] || fallbackGalleryImages[index % fallbackGalleryImages.length]} alt={post.title} />
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
