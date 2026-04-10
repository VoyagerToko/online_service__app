import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const CONTENT: Record<string, { title: string; body: string }> = {
  '/about': {
    title: 'About Servify',
    body: 'Servify connects households with verified home-service professionals through transparent pricing, clear communication, and dependable delivery.',
  },
  '/careers': {
    title: 'Careers',
    body: 'We are hiring across product, operations, and customer experience. Reach out to careers@servify.com to learn about open roles.',
  },
  '/blog': {
    title: 'Servify Blog',
    body: 'Service checklists, maintenance guides, and product updates are published in our blog feed. New posts are coming soon.',
  },
  '/contact': {
    title: 'Contact',
    body: 'Need support? Email support@servify.com or call +91 98765 43210. Our team is available to help with bookings and account issues.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    body: 'We collect only the data required to operate booking workflows, payments, and support. Personal data is protected using industry best practices.',
  },
  '/terms': {
    title: 'Terms of Service',
    body: 'By using Servify, users and professionals agree to service quality standards, payment rules, and cancellation policies listed in our platform terms.',
  },
};

export const InfoPage: React.FC = () => {
  const location = useLocation();
  const content = CONTENT[location.pathname] ?? {
    title: 'Information',
    body: 'The page you requested is available through the main navigation and footer links.',
  };

  return (
    <div className="pt-28 pb-20 px-6 max-w-5xl mx-auto">
      <Card className="p-8 md:p-10">
        <h1 className="text-4xl font-display font-bold dark:text-white mb-4">{content.title}</h1>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">{content.body}</p>
        <div className="mt-8 flex gap-3">
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
          <Link to="/services">
            <Button variant="outline">Browse Services</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
