import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge';
import ScoreBadge from '../components/ScoreBadge';
import Navbar from '../components/Navbar';
import ResultView from '../components/ResultView';
import { AuthContext } from '../context/AuthContext';

describe('Frontend Component Unit Tests', () => {
  describe('SeverityBadge', () => {
    it('should render High severity badge with red style class', () => {
      render(<SeverityBadge severity="High" />);
      const badge = screen.getByText('High');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-high');
    });

    it('should render Medium severity badge', () => {
      render(<SeverityBadge severity="Medium" />);
      const badge = screen.getByText('Medium');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-medium');
    });

    it('should render Low severity badge', () => {
      render(<SeverityBadge severity="Low" />);
      const badge = screen.getByText('Low');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-low');
    });
  });

  describe('ScoreBadge', () => {
    it('should display score and rating label', () => {
      render(<ScoreBadge score={45} rating="Needs Work" />);
      expect(screen.getByText(/Score: 45\/100 \(Needs Work\)/i)).toBeInTheDocument();
    });
  });

  describe('Navbar', () => {
    it('should display Login and Register links when user is logged out', () => {
      render(
        <AuthContext.Provider value={{ user: null, logout: () => {} }}>
          <BrowserRouter>
            <Navbar />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('should display navigation links and user welcome when logged in', () => {
      render(
        <AuthContext.Provider value={{ user: { name: 'Alice' }, logout: () => {} }}>
          <BrowserRouter>
            <Navbar />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText(/Welcome, Alice/i)).toBeInTheDocument();
      expect(screen.getByText('Analyze SRS')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('ResultView', () => {
    const mockAnalysis = {
      title: 'Sample Test Analysis',
      sourceType: 'text',
      overallScore: 30,
      summary: {
        totalRequirements: 1,
        totalIssues: 1,
        rating: 'Mostly Clear',
        bySeverity: { High: 0, Medium: 1, Low: 0 },
        byCategory: { VAGUE_TERMS: 1 },
      },
      requirements: [
        {
          index: 1,
          text: 'The login process shall be fast.',
          score: 80,
          findings: [
            {
              category: 'VAGUE_TERMS',
              label: 'Vague Terms',
              severity: 'Medium',
              phrase: 'fast',
              start: 24,
              end: 28,
              explanation: 'Vague term lacks measurable threshold.',
              suggestion: 'Specify quantitative target e.g. within 2 seconds.',
            },
          ],
          suggestedRewrite: 'The login process shall complete within 2.0 seconds.',
        },
      ],
    };

    it('should render analysis result with highlighted text and suggested rewrite', () => {
      render(<ResultView analysis={mockAnalysis} />);

      expect(screen.getByText('Sample Test Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Vague term lacks measurable threshold/i)).toBeInTheDocument();
      expect(screen.getByText(/The login process shall complete within 2.0 seconds/i)).toBeInTheDocument();
    });
  });
});
