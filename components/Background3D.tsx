import React, { useEffect, useRef } from 'react';

const Background3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    setSize();
    window.addEventListener('resize', setSize);

    // Star properties
    const stars: { x: number; y: number; z: number; prevZ: number }[] = [];
    const numStars = 800;
    const speed = 2; // Warp speed

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z: Math.random() * width,
        prevZ: Math.random() * width
      });
    }

    const animate = () => {
      // Clear with trail effect
      ctx.fillStyle = 'rgba(2, 6, 23, 0.4)'; // slate-950 with opacity for trails
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      stars.forEach(star => {
        star.z -= speed;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * width;
          star.y = (Math.random() - 0.5) * height;
          star.z = width;
          star.prevZ = width;
        }

        const x = (star.x / star.z) * width + cx;
        const y = (star.y / star.z) * height + cy;
        
        const px = (star.x / star.prevZ) * width + cx;
        const py = (star.y / star.prevZ) * height + cy;

        star.prevZ = star.z;

        if (x >= 0 && x <= width && y >= 0 && y <= height) {
          const alpha = (1 - star.z / width);
          const size = (1 - star.z / width) * 2;
          
          ctx.beginPath();
          ctx.strokeStyle = `rgba(200, 230, 255, ${alpha})`;
          ctx.lineWidth = size;
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 bg-slate-950"
    />
  );
};

export default Background3D;