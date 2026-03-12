const GradientBlobs = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 50%, #0d0721 0%, #050508 60%)',
      }} />
      {/* Blob 1 */}
      <div
        className="absolute rounded-full opacity-15"
        style={{
          width: 800, height: 800,
          top: '10%', left: '10%',
          background: 'radial-gradient(circle, #1a0533, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'blob1 20s ease-in-out infinite',
        }}
      />
      {/* Blob 2 */}
      <div
        className="absolute rounded-full opacity-15"
        style={{
          width: 600, height: 600,
          top: '50%', right: '10%',
          background: 'radial-gradient(circle, #0d0721, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'blob2 30s ease-in-out infinite',
        }}
      />
      {/* Blob 3 */}
      <div
        className="absolute rounded-full opacity-15"
        style={{
          width: 700, height: 700,
          bottom: '10%', left: '40%',
          background: 'radial-gradient(circle, #110022, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'blob3 25s ease-in-out infinite',
        }}
      />
    </div>
  );
};

export default GradientBlobs;
