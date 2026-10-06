import React from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart2, Compass, Lightbulb, SlidersHorizontal } from 'lucide-react';

const guideCards = [
  {
    icon: Activity,
    title: 'PCA, in a nutshell',
    text: 'PCA (Principal Component Analysis) combines related measurements into a smaller set of new measurements. It helps you spot patterns in data with many columns.',
    color: 'var(--accent-cyan)'
  },
  {
    icon: Compass,
    title: 'Principal components (PCs)',
    text: 'PC1 captures the biggest pattern in the data; PC2 captures the next biggest, and so on. Each PC is a direction made from your original features.',
    color: 'var(--accent-purple)'
  },
  {
    icon: BarChart2,
    title: 'Explained variance',
    text: 'This percentage tells you how much of the data’s variation a PC keeps. Cumulative variance adds the PCs together: for example, PC1 + PC2 tells you what a 2D view retains.',
    color: 'var(--accent-lime)'
  },
  {
    icon: SlidersHorizontal,
    title: 'How many PCs should I keep?',
    text: 'There is no single right number. Use the fewest PCs that keep enough information for your goal. Around 80–90% cumulative variance is a useful starting point, not a strict rule; also look for the “elbow” in the scree plot.',
    color: 'var(--accent-gold)'
  },
  {
    icon: Lightbulb,
    title: 'Why reduce dimensions?',
    text: 'Using fewer PCs makes data simpler to explore, but can hide useful patterns. Using more PCs keeps more variation but is less compact. A 2D or 3D view can only show the PCs assigned to its axes.',
    color: 'var(--accent-magenta)'
  }
];

export const AboutGuide: React.FC = () => (
  <section className="about-guide" aria-labelledby="about-guide-title">
    <div className="about-guide-heading">
      <span className="badge badge-cyan">QUICK GUIDE</span>
      <h2 id="about-guide-title">Understand PCA Matrix Studio</h2>
      <p>A simple guide to the charts, the terms, and choosing how much information to keep.</p>
    </div>

    <div className="about-guide-grid">
      {guideCards.map(({ icon: Icon, title, text, color }) => (
        <article className="glass-panel about-guide-card" key={title}>
          <div className="about-guide-icon" style={{ color }}>
            <Icon size={19} />
          </div>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>

    <section className="about-k-guide" aria-labelledby="about-k-title">
      <div>
        <span className="badge badge-cyan">THE K SLIDER</span>
        <h3 id="about-k-title">What happens when I increase or decrease K?</h3>
        <p>K is the number of top principal components you choose to retain. On the Scree Plot, move the slider to see the retained and lost variance update.</p>
      </div>
      <div className="about-k-options">
        <article className="about-k-option">
          <ArrowUpRight size={20} color="var(--accent-lime)" />
          <div>
            <h4>Increase K</h4>
            <p>Keep more components. Information retained goes up, information lost goes down, and the reduced data has more dimensions.</p>
          </div>
        </article>
        <article className="about-k-option">
          <ArrowDownRight size={20} color="var(--accent-gold)" />
          <div>
            <h4>Decrease K</h4>
            <p>Keep fewer components. The data becomes simpler and more compact, but information lost goes up and smaller patterns may disappear.</p>
          </div>
        </article>
      </div>
      <p className="about-guide-note">Changing K adjusts the Scree Plot’s retained/lost summary; it does not change your original dataset.</p>
    </section>

    <aside className="about-guide-tip">
      <strong>Quick workflow</strong>
      <span>Clean missing values → scale features → check the Scree Plot → explore patterns in 2D or 3D.</span>
      <span className="about-guide-note">Scaling matters when features use different units; standard scaling gives each feature a comparable starting scale.</span>
    </aside>
  </section>
);
