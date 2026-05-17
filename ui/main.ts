import './interceptors';
import { render } from 'preact';
import { createElement } from 'preact/compat';
import { Debugbar } from './components/Debugbar';

const mount = () => {
  const el = document.createElement('div');
  el.id = '__debugbar-root';
  document.body.appendChild(el);
  render(createElement(Debugbar, {}), el);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
