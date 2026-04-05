import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, MapPin, Search } from 'lucide-react';
import './index.css';


const RevealOnScroll = ({ children, className = "", style = {}, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <section 
      ref={ref} 
      className={`reveal ${isVisible ? 'visible' : ''} ${className}`} 
      style={{ ...style, transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </section>
  );
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxStyle = (speed) => ({
    transform: `translateY(${scrollY * speed}px)`
  });

  return (
    <main className="w-full min-h-screen bg-offwhite">

      
      <header className="relative z-50">
  {/* Navbar Minimalist */}
  <nav className="flex justify-between items-center px-10 py-6 relative z-50">
    <section className="flex-1 flex items-center">
      <section aria-label="Logo" className="font-display text-dark text-2xl tracking-tighter">UNIMART</section>
    </section>

    <ul className="flex-1 hidden md:flex justify-center gap-8 text-[0.85rem] font-semibold uppercase tracking-wider">
      <li><a href="#" className="text-dark hover:text-primary transition-colors">How It Works</a></li>
      <li><a href="#" className="text-dark hover:text-primary transition-colors">Safety</a></li>
    </ul>

    <section className="flex-1 flex justify-end items-center gap-4">
      <button className="hidden md:block bg-dark text-white px-6 py-2.5 rounded-full font-semibold text-[0.85rem] hover:bg-primary transition-colors">
        Sign In
      </button>
      <button
        className="md:hidden flex items-center justify-center text-dark"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </section>
  </nav>

  {isMenuOpen && (
    <section className="absolute top-full left-0 w-full bg-offwhite shadow-md flex flex-col items-center gap-6 py-8 z-40 md:hidden">
      <a href="#" className="text-dark font-semibold uppercase text-sm">How It Works</a>
      <a href="#" className="text-dark font-semibold uppercase text-sm">Safety</a>
      <button className="bg-dark text-white px-6 py-2 rounded-full font-semibold text-sm">
        Sign in
      </button>
    </section>
  )}
</header>

      {/* 1. Bento Hero Section */}
      <section className="px-5 md:px-10 pb-16 max-w-[1400px] mx-auto">
        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[65vh]">
          
          {/* Left Large Column */}
          <RevealOnScroll className="relative rounded-[20px] overflow-hidden bg-dark">
            <section className="w-full h-full lg:absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80" 
                alt="Student Lifestyle" 
                className="w-full h-[400px] lg:h-full object-cover"
              />
            </section>
            
            {/* Overlay Buttons */}
            <section className="absolute bottom-8 left-8 flex flex-wrap gap-4 z-10">
              <button className="px-6 py-2 rounded-full font-semibold text-[0.85rem] flex items-center gap-3 bg-white text-dark hover:bg-gray-100 transition-colors">
                 Browse Marketplace<span className="w-6 h-6 rounded-full flex justify-center items-center bg-dark text-white"><ArrowRight size={14}/></span>
              </button>
              <button className="px-6 py-2 rounded-full font-semibold text-[0.85rem] flex items-center gap-3 bg-transparent border border-white/40 text-white hover:bg-white/10 transition-colors">
                 Get started
              </button>
            </section>
            
            {/* SVG Floating Circle Badge */}
            <section className="absolute top-[10%] right-[5%] animate-spin-slow z-10">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <defs>
                  <path id="circle-text-path" d="M 60, 60 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0" />
                </defs>
                <text fontSize="13" fill="#fff" fontWeight="bold" letterSpacing="2.5">
                  <textPath href="#circle-text-path">
                    • VERIFIED • SAFE • CAMPUS ONLY • VERIFIED • SAFE • CAMPUS ONLY
                  </textPath>
                </text>
              </svg>
            </section>
          </RevealOnScroll>

          {/* Right Column (Stacked) */}
          <section className="flex flex-col gap-6">
            
            {/* Top Text Block */}
            <RevealOnScroll delay={100} className="flex-1 rounded-[20px] p-8 md:p-12 flex flex-col justify-center bg-white shadow-sm">
              <h1 className="font-display text-[2.5rem] lg:text-[4vw] leading-[1] mb-6 tracking-tight uppercase">
                SAFE TRADES<br/>
                FOR <span className="text-outline-wrapper"><span className="text-outline">VERIFIED</span></span><br/>
                STUDENTS
              </h1>
              <p className="text-base text-text-muted leading-relaxed max-w-[80%]">
               A secure campus marketplace where students can buy, sell, and trade through verified accounts, built-in messaging, and designated safe trade zones.
              </p>
            </RevealOnScroll>
            
            {/* Bottom 2 Images */}
            <section className="grid grid-cols-2 gap-6 h-[180px]">
              <RevealOnScroll delay={200} className="rounded-[20px] overflow-hidden relative group shadow-sm bg-white">
                <img 
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80" 
                  alt="Tech" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <section className="absolute bottom-4 left-4 text-white font-display text-2xl drop-shadow-md">#TECH</section>
              </RevealOnScroll>
              
              <RevealOnScroll delay={300} className="rounded-[20px] overflow-hidden relative group shadow-sm bg-white">
                <img 
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80" 
                  alt="Books" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <section className="absolute bottom-4 left-4 text-white font-display text-2xl drop-shadow-md">#CAMPUS ESSENTIALS</section>
              </RevealOnScroll>
            </section>
            
          </section>
        </section>
        
        {/* Paragraph typography block below hero */}
        <RevealOnScroll delay={400} className="mt-16 max-w-[1000px]">
        <p className="text-[1.5rem] md:text-[2.25rem] font-medium leading-snug tracking-tight">
          Unimart helps students trade safely within their university community through <span className="inline-flex items-center justify-center border-2 border-dark px-4 h-[2.1rem] rounded-full text-[1.4rem] font-semibold align-middle mx-1.5 relative -top-[3px]">✱ verified accounts</span>, secure messaging, and trusted on-campus exchange points.
        </p>
        </RevealOnScroll>
      </section>

      {/* 2. Asymmetrical Grid */}
      <section className="py-24 px-5 md:px-10 max-w-[1400px] mx-auto">
        <section className="flex flex-col md:grid md:grid-cols-12 gap-8">
          
          {/* Card 1 */}
          <RevealOnScroll className="md:col-span-4 md:col-start-2 bg-white rounded-[20px] relative shadow-sm overflow-hidden hover:-translate-y-1 transition-transform duration-300 border border-light">
            <section className="absolute top-3 right-5 text-[2.5rem] text-light font-display z-10">01.</section>
            <section className="w-full bg-light h-[280px]">
              <img src="/Images/listimage.jpg" alt="List item" className="w-full h-full object-cover" />
            </section>
            <section className="p-6 flex flex-col gap-3">
              <h3 className="font-bold text-[1.1rem]">List in Minutes</h3>
              <p className="text-text-muted text-[0.9rem] leading-relaxed mb-2">Add an item, price, and description so other verified students can discover it quickly.</p>
              <button className="w-10 h-10 rounded-full border border-light bg-white text-dark flex items-center justify-center hover:bg-dark hover:text-white transition-colors"><ArrowRight size={16} /></button>
            </section>
          </RevealOnScroll>

          {/* Card 2 */}
          <RevealOnScroll delay={200} className="md:col-span-4 md:col-start-7 md:mt-24 bg-white rounded-[20px] relative shadow-sm overflow-hidden hover:-translate-y-1 transition-transform duration-300 border border-light">
            <section className="absolute top-3 right-5 text-[2.5rem] text-light font-display z-10">02.</section>
            <section className="w-full bg-light h-[200px]">
              <img src="/Images/messageimage.jpg" alt="Connect" className="w-full h-full object-cover" />
            </section>
            <section className="p-6 flex flex-col gap-3">
              <h3 className="font-bold text-[1.1rem]">Message Safely</h3>
              <p className="text-text-muted text-[0.9rem] leading-relaxed mb-2">Talk to buyers and sellers inside the platform without sharing personal contact details.</p>
              <button className="w-10 h-10 rounded-full border border-light bg-white text-dark flex items-center justify-center hover:bg-dark hover:text-white transition-colors"><ArrowRight size={16}/></button>
            </section>
          </RevealOnScroll>

          {/* Card 3 */}
          <RevealOnScroll className="md:col-span-6 md:col-start-4 md:mt-12 bg-white rounded-[20px] relative shadow-sm overflow-hidden hover:-translate-y-1 transition-transform duration-300 border border-light">
            <section className="absolute top-3 right-5 text-[2.5rem] text-light font-display z-10">03.</section>
            <section className="w-full bg-[#1a1a1a] text-white flex justify-center items-center h-[280px]">
              <MapPin size={40} className="text-primary animate-bounce-slow"/>
            </section>
            <section className="p-6 flex flex-row justify-between items-end gap-3">
              <section>
                <h3 className="font-bold text-[1.1rem] mb-2">Secure Exchange</h3>
                <p className="text-text-muted text-[0.9rem] leading-relaxed m-0">Items are exchanged through a structured campus process, ensuring both buyer and seller are protected without direct meetups.</p>
              </section>
              <button className="w-10 h-10 rounded-full flex-none border border-light bg-white text-dark flex items-center justify-center hover:bg-dark hover:text-white transition-colors"><ArrowRight size={16}/></button>
            </section>
          </RevealOnScroll>

        </section>
      </section>

      {/* 3. Stacked Text Parallax Section */}
      <section className="py-20 bg-white text-center relative overflow-hidden">
        <RevealOnScroll>
          <section className="mb-16">
            <h2 className="text-[1.5rem] font-semibold tracking-[-0.5px]">Designed for Students,<br/>Built For Campus.</h2>
          </section>
        </RevealOnScroll>
        
        <section className="flex flex-col items-center relative leading-[0.9]">
          <section className="text-[10vw] font-display text-outline relative whitespace-nowrap" style={parallaxStyle(-0.05)}>TEXTBOOKS<span className="inline-block w-[2vw] h-[2vw] rounded-full bg-primary absolute -right-[3vw] top-[20%]"></span></section>
          <section className="text-[10vw] font-display text-dark relative whitespace-nowrap" style={parallaxStyle(0.08)}>ELECTRONICS<span className="inline-block w-[2vw] h-[2vw] rounded-full bg-dark absolute -right-[3vw] top-[20%]"></span></section>
          <section className="text-[10vw] font-display text-outline relative whitespace-nowrap" style={parallaxStyle(-0.1)}>CLOTHING<span className="inline-block w-[2vw] h-[2vw] rounded-full bg-primary absolute -right-[3vw] top-[20%]"></span></section>
          <section className="text-[10vw] font-display text-transparent relative whitespace-nowrap" style={{ WebkitTextStroke: '1px #334155', ...parallaxStyle(0.05) }}>AND MORE<span className="inline-block w-[2vw] h-[2vw] rounded-full bg-dark absolute -right-[3vw] top-[20%]"></span></section>
          
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80" alt="Students" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] max-w-[400px] rounded-xl z-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" />
        </section>
      </section>

      {/* 4. Rounded Feature Showcase */}
<section className="py-20 px-5 md:px-10 max-w-[1400px] mx-auto">
  <RevealOnScroll className="rounded-[32px] overflow-hidden relative flex min-h-[600px] bg-dark text-white">
    
    <section className="absolute inset-0 z-0">
      <img 
        src="/Images/cardimage.png"
        alt="Students on campus"
        className="w-full h-full object-cover"
      />
      <section className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30"></section>
    </section>
    
    <section className="w-full flex flex-col md:flex-row justify-between items-start md:items-center p-10 md:p-20 z-10 relative">
      
      <section className="max-w-[400px]">
        <section className="font-bold tracking-[0.1em] text-[0.875rem] mb-6 inline-block text-primary">
          TRUSTED SYSTEM
        </section>

        <h2 className="text-4xl md:text-[4rem] leading-[0.9] uppercase mb-6 font-display">
          Secure Campus<br/>Exchange<br/>System
        </h2>

        <p className="opacity-80 max-w-[300px] leading-relaxed text-[1.1rem]">
          Every transaction is handled through a structured campus system, ensuring items are exchanged securely without direct meetups between students.
        </p>
      </section>
      
   

    </section>
  </RevealOnScroll>
</section>

      {/* 5. Minimalist Product Browse Grid */}
      <section className="py-24 px-5 md:px-10 max-w-[1400px] mx-auto">
        <RevealOnScroll>
          <h2 className="text-center text-[2rem] font-bold mb-10 uppercase tracking-[-0.02em]">Browse The Feed</h2>
        </RevealOnScroll>
        
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { name: 'Sony WH-1000XM4', price: 'R8000', condition: 'Like New', filter: 'grayscale(100%)', image: '/Images/sonyimage.jpg' },
            { name: 'Linear Algebra 8th Ed', price: 'R1000', condition: 'Used - Good', filter: 'contrast(120%)', image: '/Images/linearalgebra.jpg' },
            { name: 'Nike Dunks Low', price: 'R2100', condition: 'Worn Once', filter: 'brightness(90%)', image: '/Images/nike.jpg' }
          ].map((item, i) => (
            <RevealOnScroll key={i} delay={i * 100} className="bg-white rounded-[20px] p-5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-shadow">
              <section className="mb-4">
                <span className="font-bold block text-[0.95rem]">{item.name}</span>
                <span className="text-[0.75rem] block mt-[2px] text-text-muted">{item.condition}</span>
              </section>
              <section className="w-full h-[260px] rounded-xl overflow-hidden bg-light flex items-center justify-center">
                <img src={item.image} style={{filter: item.filter}} alt={item.name} className="w-full h-full object-cover opacity-90" />
              </section>
              <section className="flex justify-between items-center mt-4 pt-4 border-t border-light">
                <span className="font-bold text-[1.125rem] text-primary">{item.price}</span>
                <button className="flex items-center justify-center w-8 h-8 rounded-full border border-light bg-white text-dark hover:bg-primary hover:text-white transition-colors border-none"><ArrowRight size={14}/></button>
              </section>
            </RevealOnScroll>
          ))}
        </section>
        
        <section className="flex justify-center mt-12">
          <button className="flex items-center gap-2 px-8 py-3 rounded-full border border-dark font-semibold text-[0.9rem] hover:bg-dark hover:text-white transition-colors">
            View All Marketplace <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[0.8rem] ml-2">+</span>
          </button>
        </section>
      </section>

      {/* 6. Massive Footer CTA */}
      <footer className="pt-32 px-5 md:px-10 flex flex-col items-center text-center relative overflow-hidden bg-dark text-white">
        <section className="w-full max-w-[1000px] z-10 relative">
          <RevealOnScroll>
             <h2 className="text-[3rem] md:text-[4rem] font-bold uppercase tracking-[-0.02em] leading-[1.1] mb-8">
               BUY. SELL. TRADE.<br/>
               <span className="text-primary">SAFELY</span> ON CAMPUS.
             </h2>
          </RevealOnScroll>
          
          <section className="flex flex-col md:flex-row justify-between text-left mt-24 mb-16 border-b border-zinc-800 pb-12 gap-10">
            <section>
              <p className="text-zinc-500 mb-4 uppercase text-[0.875rem] font-bold tracking-[0.1em]">Platform</p>
              <ul className="space-y-2">
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Browse Marketplace</a></li>
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">How It Works</a></li>
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Secure Exchange</a></li>
              </ul>
            </section>
            <section>
              <p className="text-zinc-500 mb-4 uppercase text-[0.875rem] font-bold tracking-[0.1em]">Trust</p>
              <ul className="space-y-2">
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Safety</a></li>
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Verification</a></li>
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Guidelines</a></li>
              </ul>
            </section>
            <section>
              <p className="text-zinc-500 mb-4 uppercase text-[0.875rem] font-bold tracking-[0.1em]">Account</p>
              <ul className="space-y-2">
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Get started</a></li>
                <li><a href="#" className="text-white text-[0.875rem] font-medium uppercase transition-colors hover:text-primary">Sign in</a></li>
              </ul>
            </section>
          </section>
        </section>
        
        <RevealOnScroll className="text-[18vw] leading-[0.8] mb-[-2vw] font-extrabold tracking-[-0.02em] text-center text-white font-display">
          UNIMART
        </RevealOnScroll>
      </footer>
    </main>
  );
}
