import { useEffect, useRef, useState } from 'react';
import './HangingText.css';

const TEXT_CONTENT = `是走不去的路一风图说的的空反安不里是的正好抵达而扮是而大什意是一长读
哲不是起借走一破上书时旅自换复全旅之世从的脚达行是成为在胆么迈另迈路万
停思最时口成看浪的人刻行己了权却行行界来智愿步不先回谨了于盲也出一界在巷
不索后一自见会点一是让感心衡不的始的不者你慢如夺到慎收拥险设的种往脚书
是的一一海己是有赶一踏人到境最是人于终是是的一好去真让集有要读第开住下不
归人步尽到的开时路沉入遗陌便终造只足点山先脚点好你实你地新么懂一始是一如
宿翻而头无答始直才默未逊生是两船读下与把步也赶的比把名眼在步在想一行
了是并边窦抵挂是是知因新头的了一行水书比仍路言例岸而踏安船安象你万
人很你非天达云生理之为离世落目一一到而读目然一语的边是一全停世静力会里
生多终掩作山是帆命解地看开界空的页最水是进光在一再开误为一和在界里的发路
要页于境岸高奏济本的一见海一一难穷你心走前抵把始认了同遗港是现终现一
么却愿只一水任沧身房一自岸每真一一的处停里得进达你作让一憾湾一身点固一
大什意是一长读海间因己才年正舒而一坐下再更是变最远熟片之里本而住而
胆么迈另迈路万一心话为有看去的适只步看来把远长地成好方总天间曼书千不你真
冒也出一界在巷一之语那多得一发是走不云的路一风图说的的空反安不里是的正
险没的种往脚书时所是时么见个现暂不是起借走一破上书时旅自换复全旅之世从的
要读第开住下不运向以你秒新从之停思最时口成看浪的人刻行己了权却行行界来智
么懂一始是一如会索后暂小的未旅不索后一自见会点一是让感心衡不的始的不者
在步在想一行来展才不一海去不是的一一海己是有赶一踏人到境最是人于终是是
安船安象你万但以打被一洋过在归人步尽到的开时路沉入遗陌便终造只足点山先
全停世静力会里帆住开旧秒一的于宿翻而头无答始直才默未逊生是两船读下与把
和在界里的发路必一的故小一地寻了是并边窦抵挂是是知因新头的了一行水书
遗港是现终现一须一门事不怨方找人很你非天达云生理之为离世落目一一到而读
憾湾一身点固一事方定是惧一新生多终掩作山是帆命解地看开界空的页最水是进
之里本而住而先向与义善常一风要页于境岸高奏济本的一见海一一难穷你心
间曼书千不你真挂对真寻打不景么却愿只一水任沧身房一自岸每真一一的处停里
反安不里是的正好抵旅而是扮大什意是一长读海间因己才年正舒而一坐下再
复全旅之世从的脚达行是成为在胆么迈另迈路万一心话为有看去的适只步看来把
权却行行界来智愿步不先回谨了于盲也出一界在巷一之语那多得一发是走不云的路`;

// Split by newlines to get columns, then by characters to get individual spans.
const columns = TEXT_CONTENT.split('\n');

export default function HangingText() {
  const containerRef = useRef(null);
  const charsRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // initial off-screen
  
  useEffect(() => {
    // Collect all char spans
    const spans = containerRef.current.querySelectorAll('.char');
    const charsData = Array.from(spans).map(span => {
      const rect = span.getBoundingClientRect();
      return {
        el: span,
        initialX: 0,
        initialY: 0,
        currentX: 0,
        currentY: 0,
        // Calculate center of the span relative to viewport
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    });
    
    charsRef.current = charsData;

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    // Update bounding boxes on scroll or resize
    const updateRects = () => {
      charsRef.current.forEach(char => {
        // Temporarily reset transform to get true position
        char.el.style.transform = `translate(0px, 0px)`;
      });
      charsRef.current.forEach(char => {
        const rect = char.el.getBoundingClientRect();
        char.centerX = rect.left + rect.width / 2;
        char.centerY = rect.top + rect.height / 2;
        char.el.style.transform = `translate(${char.currentX}px, ${char.currentY}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', updateRects);
    window.addEventListener('scroll', updateRects);

    let animationFrameId;
    const effectRadius = 150; // pixels
    const pushForce = 0.5; // multiplier
    const returnSpeed = 0.1;

    const animate = () => {
      charsRef.current.forEach(char => {
        // Calculate distance from mouse to character's absolute position
        const dx = char.centerX + char.currentX - mouseRef.current.x;
        const dy = char.centerY + char.currentY - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < effectRadius) {
          // Push away (mimics distance < 5 in original script, but mapped to pixels)
          // The closer it is, the stronger the push. We'll use a simple linear falloff.
          const force = (effectRadius - dist) / effectRadius;
          // Normalize vector
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;
          
          char.currentX += nx * force * 20 * pushForce;
          char.currentY += ny * force * 20 * pushForce;
        } else {
          // Return to origin (mimics bead.userData.initialX logic)
          char.currentX += (char.initialX - char.currentX) * returnSpeed;
          char.currentY += (char.initialY - char.currentY) * returnSpeed;
        }

        // Apply transform
        char.el.style.transform = `translate(${char.currentX}px, ${char.currentY}px)`;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('scroll', updateRects);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="hanging-text-container" ref={containerRef}>
      {columns.map((col, colIndex) => (
        <div key={colIndex} className="text-column">
          {col.split('').map((char, charIndex) => (
            <span key={charIndex} className="char">
              {char}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
