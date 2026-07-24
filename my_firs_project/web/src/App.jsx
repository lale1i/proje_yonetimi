import React, { useState } from 'react';
import './App.css';
import galataImg from '../kuleler/galata_kulesi.png';
import saatImg from '../kuleler/saat_kulesi.png';
import CanvasEffect from './components/effect/CanvasEffect';
import { Ruler, Calendar, Feather, MapPin, ShieldCheck, Clock, Compass, Sparkles, Landmark } from 'lucide-react';

const MONUMENTS = {
  galata: {
    id: 'galata',
    city: 'İstanbul',
    subtitle: 'İstanbul’un gözcüsü, zamanın tanığı.',
    title: (
      <>
        Galata,<br />
        martıların şahidi,<br />
        yedi tepenin bekçisi,<br />
        gökyüzüne uzanan<br />
        taş.
      </>
    ),
    poem: (
      <>
        Gözlerini kapattığında şehri dinle,<br />
        taşlarında yankılanan eski zamanları,<br />
        ve denizin rüzgarla buluştuğu o yüksek tepede<br />
        saklı kalan asırlık sırları.
      </>
    ),
    didYouKnow: "Hezarfen Ahmed Çelebi, 1632 yılında kendi tasarladığı tahta kanatlarla Galata Kulesi’nden havalanıp Boğaz’ı aşarak 3.358 metre ötedeki Üsküdar Doğancılar Meydanı’na ulaşmıştır.",
    facts: [
      {
        id: 'height',
        icon: Ruler,
        label: 'YÜKSEKLİK',
        value: '62.59 Metre',
        detail: '9 katlı görkemli taş kule mimarisi'
      },
      {
        id: 'year',
        icon: Calendar,
        label: 'İNŞA YILI',
        value: '1348',
        detail: 'Cenevizliler (Christea Turris - İsa Kulesi)'
      },
      {
        id: 'event',
        icon: Feather,
        label: 'EFSANEVİ UÇUŞ',
        value: 'Hezarfen A. Çelebi',
        detail: '1632 Kıtalararası ilk insanlı uçuş'
      },
      {
        id: 'location',
        icon: MapPin,
        label: 'KONUM',
        value: 'Beyoğlu / İstanbul',
        detail: 'Haliç ve Boğaz’ın birleştiği zirve tepe'
      },
      {
        id: 'status',
        icon: ShieldCheck,
        label: 'DÜNYA MİRASI',
        value: 'UNESCO Liste',
        detail: '2013’ten beri Dünya Mirası Geçici Listesinde'
      }
    ],
    image: galataImg,
    otherId: 'saat',
    otherName: 'Saat Kulesi',
    otherImage: saatImg,
  },
  saat: {
    id: 'saat',
    city: 'Bursa',
    subtitle: 'Bursa’nın zirvesi, ecdadın mirası.',
    title: (
      <>
        Tophane,<br />
        zamanın nabzı,<br />
        Osmanlının kalbi,<br />
        şehri saran<br />
        yankı.
      </>
    ),
    poem: (
      <>
        Sokaklarında yankılanan her çan sesi,<br />
        geçmişin ihtişamını bugüne taşır,<br />
        tepelerden süzülen tarihle birleşip<br />
        geleceğe köprü kurar.
      </>
    ),
    didYouKnow: "Bursa Tophane Saat Kulesi, II. Abdülhamid'in tahta çıkışının 30. yılı anısına 1905'te inşa edilmiştir. Yıllarca kente zamanı bildirmesinin yanında yangın gözetleme kulesi olarak da hizmet vermiştir.",
    facts: [
      {
        id: 'height',
        icon: Ruler,
        label: 'YÜKSEKLİK',
        value: '33 Metre',
        detail: '6 katlı kare planlı kesme taş işçiliği'
      },
      {
        id: 'year',
        icon: Calendar,
        label: 'İNŞA YILI',
        value: '1905',
        detail: 'Sultan II. Abdülhamid dönemi eseri'
      },
      {
        id: 'function',
        icon: Clock,
        label: 'ÇİFTE İŞLEV',
        value: 'Zaman & Gözetleme',
        detail: 'Saat kulesi ve tarihi yangın kulesi'
      },
      {
        id: 'location',
        icon: MapPin,
        label: 'KONUM',
        value: 'Tophane / Bursa',
        detail: 'Osman Gazi ve Orhan Gazi Türbeleri yanı'
      },
      {
        id: 'view',
        icon: ShieldCheck,
        label: 'PANORAMİK SEYİR',
        value: 'Bursa & Uludağ',
        detail: 'Tarihi kentin tüm manzarasını kucaklar'
      }
    ],
    image: saatImg,
    otherId: 'galata',
    otherName: 'Galata Kulesi',
    otherImage: galataImg,
  }
};

function App() {
  const [activeId, setActiveId] = useState('galata');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeData = MONUMENTS[activeId];

  const handleToggle = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveId(activeData.otherId);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <div className="canvas-container">
      <header className="header">
        <div className="brand-nav">
          <span className="brand">Budarina</span>
          <nav className="nav-links">
            <a href="#" className="nav-link active">Anasayfa</a>
            <span className="dot">·</span>
            <a href="#" className="nav-link">Kuleler</a>
            <span className="dot">·</span>
            <a href="#" className="nav-link">Hikayeler</a>
          </nav>
        </div>

        <button className="play-button">
          Play
        </button>
      </header>

      <main className="main-layout" key={activeId}>
        <section className="col-left">
          <div className="left-badge fade-in-left delay-1">
            <div className="badge-stamp">
              <img src={activeData.image} alt={activeData.city} />
            </div>
            <div className="badge-text">
              <span className="badge-title">{activeData.city}</span>
              <span className="badge-sub">{activeData.subtitle}</span>
            </div>
          </div>

          <h1 className="main-title fade-in-left delay-2">
            {activeData.title}
          </h1>
        </section>

        <section className="col-center fade-in-up delay-3">
          <div className="center-content-wrapper">
            <div className="tower-image-wrapper">
              <img
                src={activeData.image}
                alt={activeId}
                className="tower-image"
              />
            </div>
            <div className="canvas-effect-wrapper">
              <CanvasEffect key={activeId} />
            </div>
          </div>
        </section>

        <section className="col-right fade-in-right delay-4">
          <div className="top-right-actions">
            <button className="stamp stamp-toggle" onClick={handleToggle} title="Diğer esere geç">
              <div className="stamp-thumb-container">
                <img src={activeData.otherImage} alt={activeData.otherName} className="stamp-thumb" />
              </div>
              <span>{activeData.otherName}</span>
              <div className="stamp-box"></div>
            </button>
          </div>

          <div className="facts-section">
            <h2 className="facts-title">
              <Sparkles className="sparkle-icon" size={20} />
              Hap Bilgiler
            </h2>
            <div className="facts-grid">
              {activeData.facts.map((fact) => {
                const IconComponent = fact.icon;
                return (
                  <div key={fact.id} className="fact-card">
                    <div className="fact-icon-wrapper">
                      <IconComponent size={20} />
                    </div>
                    <div className="fact-content">
                      <span className="fact-label">{fact.label}</span>
                      <div className="fact-value">{fact.value}</div>
                      <span className="fact-detail">{fact.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="did-you-know-section">
            <h3 className="did-you-know-title">
              <Landmark size={18} />
              Biliyor muydunuz?
            </h3>
            <p className="did-you-know-text">{activeData.didYouKnow}</p>
          </div>

          <div className="right-poem">
            <p>{activeData.poem}</p>
            <a href="#" className="about-link">Hakkında</a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;


