export default function TestImages() {
  return (
    <div style={{ padding: 20 }}>
      <h3>Test images (public/)</h3>
      <p>Tu devrais voir 2 blocs avec un damier + l’image.</p>

      <div style={{
        display: "inline-block",
        width: 220, height: 220, 
        backgroundImage: "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
        backgroundSize: "20px 20px", backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
        border: "1px solid #999", marginRight: 16
      }}>
        <img
          src="/piggy.png?v=1" // cache-buster
          alt="piggy"
          style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
          onLoad={() => console.log("✅ piggy.png chargé")}
          onError={() => console.error("❌ /piggy.png introuvable")}
        />
      </div>

      <div style={{
        display: "inline-block",
        width: 120, height: 120,
        backgroundImage: "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
        backgroundSize: "20px 20px", backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
        border: "1px solid #999"
      }}>
        <img
          src="/coin.png?v=1"
          alt="coin"
          style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
          onLoad={() => console.log("✅ coin.png chargé")}
          onError={() => console.error("❌ /coin.png introuvable")}
        />
      </div>
    </div>
  );
}
