import { useMemo, useState } from "react";

const editorialImages = {
  booking: "/AGENDE SEU HORÁRIO - ALFA BARBEARIA.jpeg",
  beard: "/barba.jpeg",
  ambience: "/ambiente.jpeg"
};

export function GalleryStrip({ galleryPosts }) {
  const [activePanel, setActivePanel] = useState("posts");

  const editorialPosts = useMemo(
    () => [
      {
        id: "editorial-booking",
        title: galleryPosts[0]?.title || "Agenda premium",
        caption:
          galleryPosts[0]?.caption ||
          "Reserva direta, leitura clara e presenca visual forte para transformar o primeiro contato em decisao de agendamento.",
        tag: galleryPosts[0]?.tag || "Reserva",
        imageUrl: editorialImages.booking
      },
      {
        id: "editorial-beard",
        title: galleryPosts[1]?.title || "Barba de presenca",
        caption:
          galleryPosts[1]?.caption ||
          "Desenho limpo, volume equilibrado e acabamento preciso para valorizar a barba como servico de alto nivel.",
        tag: galleryPosts[1]?.tag || "Barba premium",
        imageUrl: editorialImages.beard
      },
      {
        id: "editorial-ambience",
        title: galleryPosts[2]?.title || "Ambiente que vende",
        caption:
          galleryPosts[2]?.caption ||
          "O espaco da barbearia reforca confianca, eleva a percepcao da marca e sustenta a operacao com imagem real.",
        tag: galleryPosts[2]?.tag || "Experiencia",
        imageUrl: editorialImages.ambience
      }
    ],
    [galleryPosts]
  );

  return (
    <section className="gallery-strip">
      <div className="section-head">
        <div>
          <span className="mini-badge">Visual</span>
          <h2>Imagem de marca</h2>
        </div>
        <p>Campanhas visuais, ambiente real e uma vitrine propria para barba completa.</p>
      </div>

      <div className="pill-switch gallery-switch" role="tablist" aria-label="Visual da marca">
        <button
          className={activePanel === "posts" ? "active" : ""}
          onClick={() => setActivePanel("posts")}
          type="button"
        >
          Publicacoes
        </button>
        <button
          className={activePanel === "look" ? "active" : ""}
          onClick={() => setActivePanel("look")}
          type="button"
        >
          Novo visual
        </button>
      </div>

      {activePanel === "posts" ? (
        <div className="gallery-grid">
          {editorialPosts.map((post) => (
            <article key={post.id} className="gallery-card">
              <img src={post.imageUrl} alt={post.title} />
              <div className="gallery-copy">
                <span className="tag">{post.tag}</span>
                <strong>{post.title}</strong>
                <p>{post.caption}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="lookbook-card">
          <div className="lookbook-visual">
            <img src={editorialImages.beard} alt="Barba completa em destaque" />
          </div>
          <div className="lookbook-copy">
            <span className="mini-badge">Novo visual</span>
            <h3>Barba completa</h3>
            <p>
              Uma vitrine dedicada para comunicar presenca, acabamento e cuidado nos detalhes com linguagem de marca
              mais madura.
            </p>
            <div className="lookbook-specs">
              <span>Contorno preciso</span>
              <span>Volume alinhado</span>
              <span>Acabamento premium</span>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
