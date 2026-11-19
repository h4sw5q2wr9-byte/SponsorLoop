import { Component } from 'react';

/** Vangt fouten op zodat je een melding ziet in plaats van een leeg scherm. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-black mb-2">Oeps, er ging iets mis</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Je rondes zijn veilig opgeslagen.</p>
          <button type="button" onClick={() => this.setState({ error: null })}
            className="bg-blue-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg mb-6">Opnieuw proberen</button>
          <p className="text-xs text-slate-400 break-all">{String(error && error.message)}</p>
          <p className="text-xs text-slate-400 break-all mt-1">{navigator.userAgent}</p>
        </div>
      </div>
    );
  }
}
