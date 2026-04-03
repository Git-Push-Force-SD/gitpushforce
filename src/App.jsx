import React, { useState } from 'react'
import { Menu, X, Search, ShoppingBag, MessageSquare, TrendingUp, Shield, Star } from 'lucide-react'

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <main className="min-h-screen bg-light">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-light shadow-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="flex justify-between items-center h-16">
            <span className="flex items-center space-x-2">
              <span className="bg-primary-500 w-10 h-10 rounded-full flex items-center justify-center">
                <ShoppingBag className="text-white" size={24} />
              </span>
              <span className="text-2xl font-bold text-primary-500">UniMart</span>
            </span>

            {/* Desktop Menu */}
            <ul className="hidden md:flex space-x-8">
              <li><a href="#features" className="text-dark hover:text-primary-500 transition">Features</a></li>
              <li><a href="#about" className="text-dark hover:text-primary-500 transition">About</a></li>
              <li><a href="#contact" className="text-dark hover:text-primary-500 transition">Contact</a></li>
            </ul>

            {/* Auth Buttons */}
            <span className="hidden md:flex space-x-4">
              <button className="px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition">Sign In</button>
              <button className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition shadow-lg">Get Started</button>
            </span>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-dark" onClick={toggleMenu}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </span>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <nav className="md:hidden pb-4 space-y-4">
              <a href="#features" className="block text-dark hover:text-primary-500">Features</a>
              <a href="#about" className="block text-dark hover:text-primary-500">About</a>
              <a href="#contact" className="block text-dark hover:text-primary-500">Contact</a>
              <span className="flex gap-2 pt-4">
                <button className="px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg flex-1">Sign In</button>
                <button className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg flex-1">Get Started</button>
              </span>
            </nav>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-secondary text-white py-20">
        <span className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <article>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Buy, Sell & Trade<br />on Campus
            </h1>
            <p className="text-lg mb-8 opacity-90">
              The exclusive peer-to-peer marketplace for university students. Trade textbooks, electronics, furniture, and more safely within your campus community.
            </p>
            <span className="flex flex-col sm:flex-row gap-4">
              <button className="bg-light text-primary-500 font-semibold py-3 px-8 rounded-lg hover:bg-opacity-90 transition shadow-lg">
                Browse Items
              </button>
              <button className="border-2 border-light text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:bg-opacity-10 transition">
                List an Item
              </button>
            </span>
          </article>
          <aside className="hidden md:block">
            <span className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 border border-white border-opacity-20 block">
              <span className="space-y-6 block">
                <span className="bg-white bg-opacity-20 h-32 rounded-xl block"></span>
                <span className="bg-white bg-opacity-20 h-20 rounded-xl block"></span>
                <span className="flex gap-4">
                  <span className="bg-white bg-opacity-20 h-12 rounded-xl flex-1"></span>
                  <span className="bg-white bg-opacity-20 h-12 rounded-xl flex-1"></span>
                </span>
              </span>
            </span>
          </aside>
        </span>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-light">
        <span className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 block">
          <header className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-primary-500">Powerful Features</h2>
            <p className="text-dark text-lg max-w-2xl mx-auto">
              Everything you need to safely buy, sell, and trade items within your campus community
            </p>
          </header>

          <span className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 block">
            {/* Feature Cards */}
            {[
              {
                icon: Search,
                title: "Smart Browsing",
                desc: "Search, filter by category, condition, and price range to find exactly what you need"
              },
              {
                icon: Shield,
                title: "Secure Trading",
                desc: "Safe drop-off and collection with trade facility management and online time slot booking"
              },
              {
                icon: MessageSquare,
                title: "In-App Messaging",
                desc: "Built-in chat system to negotiate prices and arrange transaction details securely"
              },
              {
                icon: Star,
                title: "Ratings & Reviews",
                desc: "Leave ratings and reviews after each transaction to build trust in the community"
              },
              {
                icon: TrendingUp,
                title: "Price Insights",
                desc: "AI-powered price suggestions based on item category, condition, and market trends"
              },
              {
                icon: ShoppingBag,
                title: "Easy Payments",
                desc: "Integrated payment gateway with cash shortfall options tracked through the platform"
              }
            ].map((feature, idx) => (
              <article key={idx} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition hover:scale-105 transform border border-primary-100">
                <span className="bg-primary-500 w-14 h-14 rounded-lg flex items-center justify-center mb-4 inline-block">
                  <feature.icon className="text-white" size={28} />
                </span>
                <h3 className="text-xl font-bold mb-3 text-dark">{feature.title}</h3>
                <p className="text-dark opacity-70">{feature.desc}</p>
              </article>
            ))}
          </span>
        </span>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <span className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 block">
          <header className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-primary-500">How It Works</h2>
          </header>

          <span className="grid grid-cols-1 md:grid-cols-4 gap-8 block">
            {[
              { num: "1", title: "Create Account", desc: "Sign up with your university email" },
              { num: "2", title: "List Items", desc: "Add photos, description, and price" },
              { num: "3", title: "Connect", desc: "Chat with buyers and negotiate" },
              { num: "4", title: "Trade Safely", desc: "Use our secure trade facility" }
            ].map((step, idx) => (
              <article key={idx} className="text-center">
                <span className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg inline-block">
                  <span className="text-white text-2xl font-bold">{step.num}</span>
                </span>
                <h3 className="text-xl font-bold mb-2 text-dark">{step.title}</h3>
                <p className="text-dark opacity-70">{step.desc}</p>
              </article>
            ))}
          </span>
        </span>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-500 text-white py-16">
        <span className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center block">
          <article>
            <p className="text-4xl font-bold mb-2">10K+</p>
            <p className="text-lg opacity-90">Active Students</p>
          </article>
          <article>
            <p className="text-4xl font-bold mb-2">50K+</p>
            <p className="text-lg opacity-90">Items Traded</p>
          </article>
          <article>
            <p className="text-4xl font-bold mb-2">98%</p>
            <p className="text-lg opacity-90">Satisfaction Rate</p>
          </article>
        </span>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-light">
        <span className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center block">
          <h2 className="text-4xl font-bold mb-6 text-primary-500">Ready to Start Trading?</h2>
          <p className="text-xl text-dark mb-8">
            Join thousands of students already buying and selling on UniMart
          </p>
          <button className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition shadow-lg">
            Create Your Account Today
          </button>
        </span>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12">
        <span className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 block">
          <span className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 block">
            <article>
              <h4 className="font-bold mb-4">UniMart</h4>
              <p className="text-gray-400">Your trusted campus trading platform</p>
            </article>
            <nav>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </nav>
          </span>
          <span className="border-t border-gray-800 pt-8 text-center text-gray-400 block">
            <p>&copy; 2026 UniMart. All rights reserved.</p>
          </span>
        </span>
      </footer>
    </main>
  )
}
