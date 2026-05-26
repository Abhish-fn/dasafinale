'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import styles from './contact.module.css';

const contactInfo = [
  { emoji: '📧', title: 'Email', value: 'hello@dasadinusulu.com', link: 'mailto:hello@dasadinusulu.com' },
  { emoji: '📱', title: 'Phone', value: '+91 98765 43210', link: 'tel:+919876543210' },
  { emoji: '📍', title: 'Location', value: 'Hyderabad, India', link: '' },
  { emoji: '⏰', title: 'Hours', value: 'Mon–Sat, 9 AM – 6 PM', link: '' },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast('Please fill in all required fields', 'warning');
      return;
    }
    setSending(true);
    // Simulate send (plug in actual email service later)
    await new Promise((r) => setTimeout(r, 1000));
    toast('Message sent! We\'ll get back to you soon.', 'success');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get in Touch</h1>
        <p className={styles.subtitle}>
          Have a question, feedback, or bulk order inquiry? We&apos;d love to hear from you.
        </p>
      </div>

      <div className={styles.grid}>
        {contactInfo.map((info) => (
          <div key={info.title} className={styles.infoCard}>
            <div className={styles.infoEmoji}>{info.emoji}</div>
            <div className={styles.infoTitle}>{info.title}</div>
            {info.link ? (
              <a href={info.link} className={styles.infoLink}>{info.value}</a>
            ) : (
              <div className={styles.infoValue}>{info.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>Send us a message</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name *</label>
              <input className={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email *</label>
              <input className={styles.formInput} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
          </div>
          <div className={`${styles.formGroup} ${styles.full}`} style={{ marginBottom: 'var(--space-4)' }}>
            <label className={styles.formLabel}>Subject</label>
            <input className={styles.formInput} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" />
          </div>
          <div className={`${styles.formGroup} ${styles.full}`}>
            <label className={styles.formLabel}>Message *</label>
            <textarea className={styles.formInput} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." style={{ resize: 'vertical' }} />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={sending}>
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
