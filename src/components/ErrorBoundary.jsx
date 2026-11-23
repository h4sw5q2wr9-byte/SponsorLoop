import { Component } from 'react';
import { collectInfo, submitFeedback } from '../lib/feedback.js';
import { reloadApp } from '../lib/reload.js';

/** Vangt fouten op zodat je een melding ziet in plaats van een leeg scherm. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reported: '' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error', error, info);
  }

  render() {
    const { error, reported } = this.state;
    const report = () => {
      this.setState({ reported: 'Versturen…' });
      submitFeedback({
        type: 'probleem',
        message: `Automatische melding: de app liep vast.\n\nFout: ${String(error && error.message)}`,
        info: collectInfo({ Stack: String(error && error.stack).split('\n').slice(0, 4).join(' | ') }),
      }).then(() => this.setState({ reported: 'Gemeld, bedankt!' }), (e) => this.setState({ reported: e.message }));
    };
    if (!error) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-black mb-2">Oeps, er ging iets mis</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Je rondes zijn veilig opgeslagen.</p>
          <button type="button" onClick={reloadApp}
            className="bg-blue-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg mb-3">Opnieuw proberen</button>
          <div className="mb-6">
            {reported
              ? <p className="text-sm font-bold text-slate-500">{reported}</p>
              : <button type="button" onClick={report} className="text-sm font-bold text-blue-600 dark:text-blue-400 underline">Probleem melden</button>}
          </div>
          <p className="text-xs text-slate-400 break-all">{String(error && error.message)}</p>
          <p className="text-xs text-slate-400 break-all mt-1">{navigator.userAgent}</p>
        </div>
      </div>
    );
  }
}
