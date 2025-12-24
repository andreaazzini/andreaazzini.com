import './style.css';
import { createGame } from './game/createGame';
import { mountCatalogPage } from './catalogPage';

const root = document.getElementById('game');
if (!root) throw new Error('Missing #game root element');

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
if (normalizedPath === '/catalog' && import.meta.env.DEV) {
  mountCatalogPage(root);
} else {
  createGame(root);
}
