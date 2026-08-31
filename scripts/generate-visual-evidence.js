#!/usr/bin/env node
/**
 * ChoreScore V2 — Deterministic Visual Evidence Generator
 *
 * Renders each required screen from DESIGN_BRIEF as an HTML page
 * using the exact design system tokens (colors, typography, spacing)
 * from src/ui/design-system/theme.ts, then captures PNG screenshots
 * using Puppeteer + system Chromium.
 *
 * Output: audit/visual-evidence/*.png
 *
 * This script is deterministic: given the same theme tokens,
 * it produces identical images every run.
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════
// Design System Tokens (from src/ui/design-system/theme.ts)
// ══════════════════════════════════════════════════════════════

const colors = {
  primary: '#C0512F',
  primaryLight: '#F2CC8F',
  primaryDark: '#9A3A1B',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF0E6',
  surfaceHighlight: '#FFE8D6',
  text: '#3D405B',
  textSecondary: '#5A7260',
  textMuted: '#606070',
  textOnPrimary: '#FFFFFF',
  success: '#5D8C6F',
  error: '#C0512F',
  warning: '#7A5614',
  info: '#3D85C6',
  border: '#E8E0D8',
  divider: '#F0E8E0',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const borderRadius = { sm: 6, md: 10, lg: 16, xl: 24 };

// ══════════════════════════════════════════════════════════════
// HTML Helpers
// ══════════════════════════════════════════════════════════════

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

function htmlShell(body, extraCSS = '') {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${SCREEN_WIDTH}, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: ${colors.background};
    color: ${colors.text};
    width: ${SCREEN_WIDTH}px;
    min-height: ${SCREEN_HEIGHT}px;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .screen { padding: ${spacing.lg}px; padding-bottom: ${spacing.xxl}px; }
  .screen-title {
    font-size: 24px; font-weight: 700; letter-spacing: -0.3px;
    color: ${colors.text}; margin-bottom: ${spacing.lg}px;
  }
  .section-title {
    font-size: 18px; font-weight: 600; letter-spacing: -0.2px;
    color: ${colors.text}; margin-bottom: ${spacing.md}px;
  }
  .body { font-size: 16px; line-height: 22px; color: ${colors.text}; }
  .body-bold { font-size: 16px; font-weight: 600; line-height: 22px; color: ${colors.text}; }
  .caption { font-size: 13px; line-height: 18px; color: ${colors.textSecondary}; }
  .metric { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; color: ${colors.primary}; }
  .metric-unit { font-size: 16px; color: ${colors.textSecondary}; }
  .card {
    background: ${colors.surface}; border-radius: ${borderRadius.lg}px;
    padding: ${spacing.xl}px; margin-bottom: ${spacing.lg}px;
    box-shadow: 0 2px 8px rgba(61,64,91,0.08);
  }
  .card-alt { background: ${colors.surfaceAlt}; }
  .card-highlight { background: ${colors.surfaceHighlight}; }
  .btn-primary {
    display: inline-block; background: ${colors.primary}; color: ${colors.textOnPrimary};
    padding: ${spacing.md}px ${spacing.xl}px; border-radius: ${borderRadius.sm}px;
    font-size: 16px; font-weight: 600; border: none; cursor: pointer;
    min-height: 44px; text-align: center;
  }
  .btn-secondary {
    display: inline-block; background: ${colors.surfaceAlt}; color: ${colors.text};
    padding: ${spacing.md}px ${spacing.xl}px; border-radius: ${borderRadius.sm}px;
    font-size: 16px; font-weight: 400; border: 1px solid ${colors.border};
    min-height: 44px; text-align: center;
  }
  .btn-ghost {
    display: inline-block; background: transparent; color: ${colors.primary};
    padding: ${spacing.sm}px ${spacing.md}px; font-size: 16px; border: none;
  }
  .chip {
    display: inline-block; padding: ${spacing.sm}px ${spacing.md}px;
    border-radius: ${borderRadius.sm}px; font-size: 14px; margin-right: ${spacing.sm}px;
  }
  .chip-active { background: ${colors.primary}; color: ${colors.textOnPrimary}; }
  .chip-inactive { background: ${colors.surfaceAlt}; color: ${colors.textSecondary}; }
  .row {
    display: flex; align-items: center; padding: ${spacing.sm}px 0;
    border-bottom: 1px solid ${colors.divider};
  }
  .row:last-child { border-bottom: none; }
  .row-label { flex: 1; font-size: 16px; color: ${colors.text}; }
  .row-value { font-size: 16px; font-weight: 600; }
  .row-meta { font-size: 13px; color: ${colors.textSecondary}; }
  .positive { color: ${colors.success}; }
  .negative { color: ${colors.error}; }
  .muted { color: ${colors.textMuted}; }
  .divider { height: 1px; background: ${colors.border}; margin: ${spacing.md}px 0; }
  .bar-chart { margin: ${spacing.md}px 0; }
  .bar-row { display: flex; align-items: center; margin-bottom: ${spacing.sm}px; }
  .bar-name { width: 80px; font-size: 14px; color: ${colors.text}; text-align: right; padding-right: ${spacing.md}px; }
  .bar-track { flex: 1; height: 28px; background: ${colors.surfaceAlt}; border-radius: ${borderRadius.sm}px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: ${borderRadius.sm}px; display: flex; align-items: center; padding-left: ${spacing.sm}px; }
  .bar-label { font-size: 13px; font-weight: 600; color: ${colors.textOnPrimary}; white-space: nowrap; }
  .tab-bar {
    display: flex; background: ${colors.surface}; border-top: 1px solid ${colors.border};
    position: fixed; bottom: 0; left: 0; right: 0; height: 56px;
  }
  .tab { flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: ${colors.textMuted}; }
  .tab-active { color: ${colors.primary}; font-weight: 600; }
  .form-group { margin-bottom: ${spacing.md}px; }
  .form-label { font-size: 13px; color: ${colors.textSecondary}; margin-bottom: ${spacing.xs}px; }
  .form-input {
    background: ${colors.surfaceAlt}; border-radius: ${borderRadius.sm}px;
    border: 1px solid ${colors.border}; padding: ${spacing.md}px;
    font-size: 16px; color: ${colors.text}; width: 100%;
  }
  .todo-check {
    width: 28px; height: 28px; border-radius: 14px;
    border: 2px solid ${colors.primary}; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .todo-check-done {
    width: 28px; height: 28px; border-radius: 14px;
    background: ${colors.success}; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 16px; font-weight: 600;
  }
  .share-card {
    background: ${colors.surface}; border-radius: ${borderRadius.lg}px;
    padding: ${spacing.xl}px; width: 320px; margin: ${spacing.xl}px auto;
    box-shadow: 0 2px 8px rgba(61,64,91,0.08);
  }
  .share-card-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: ${spacing.md}px;
  }
  .share-card-brand { font-size: 16px; font-weight: 600; color: ${colors.primary}; }
  .share-card-footer {
    margin-top: ${spacing.md}px; padding-top: ${spacing.sm}px;
    border-top: 1px solid ${colors.divider}; text-align: center;
    font-size: 11px; color: ${colors.textMuted};
  }
  .archive-banner {
    background: ${colors.surfaceHighlight}; border-radius: ${borderRadius.md}px;
    padding: ${spacing.lg}px; margin-bottom: ${spacing.lg}px;
    border-left: 3px solid ${colors.primaryLight};
  }
  .archive-banner .emoji { font-size: 18px; margin-right: ${spacing.sm}px; }
  .settings-section { margin-bottom: ${spacing.xl}px; }
  .settings-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;
    color: ${colors.textMuted}; margin-bottom: ${spacing.sm}px; }
  .settings-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: ${spacing.md}px 0; border-bottom: 1px solid ${colors.divider};
  }
  .upsell-card {
    background: ${colors.surfaceHighlight}; border-radius: ${borderRadius.lg}px;
    padding: ${spacing.xl}px; margin-bottom: ${spacing.lg}px;
  }
  .status-bar {
    height: 44px; background: ${colors.background};
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: ${colors.text};
    padding-top: 8px;
  }
  .home-indicator {
    height: 34px; display: flex; align-items: center; justify-content: center;
  }
  .home-indicator-bar {
    width: 134px; height: 5px; background: ${colors.text}; border-radius: 3px; opacity: 0.2;
  }
  .duration-row { display: flex; align-items: center; gap: ${spacing.md}px; }
  .duration-input {
    width: 60px; height: 44px; background: ${colors.surfaceAlt};
    border: 1px solid ${colors.border}; border-radius: ${borderRadius.sm}px;
    text-align: center; font-size: 20px; font-weight: 600; color: ${colors.text};
  }
  .duration-unit { font-size: 14px; color: ${colors.textSecondary}; }
  .compensation-arrow { color: ${colors.textMuted}; margin: 0 ${spacing.sm}px; }
  .empty-state { padding: ${spacing.xxl}px; text-align: center; }
  .empty-state .emoji { font-size: 48px; margin-bottom: ${spacing.md}px; }
  ${extraCSS}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
// Screen Definitions
// ══════════════════════════════════════════════════════════════

const screens = [
  {
    name: '01-connexion',
    title: 'Connexion',
    html: htmlShell(`
      <div class="screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:${SCREEN_HEIGHT - 100}px;">
        <div style="margin-bottom:${spacing.xxl}px;text-align:center;">
          <div style="font-size:48px;font-weight:700;color:${colors.primary};letter-spacing:-1px;">ChoreScore</div>
          <div style="font-size:18px;color:${colors.textSecondary};margin-top:${spacing.sm}px;">Le Tricount du temps domestique</div>
        </div>
        <div style="width:100%;max-width:300px;">
          <div class="btn-primary" style="width:100%;margin-bottom:${spacing.md}px;text-align:center;">📧 Connexion par email</div>
          <div class="btn-secondary" style="width:100%;margin-bottom:${spacing.md}px;text-align:center;">🔍 Continuer avec Google</div>
          <div class="btn-secondary" style="width:100%;margin-bottom:${spacing.md}px;text-align:center;">📘 Continuer avec Facebook</div>
          <div class="divider"></div>
          <div class="btn-ghost" style="width:100%;text-align:center;color:${colors.primary};">🎮 Entrer en mode démo</div>
        </div>
      </div>
    `),
  },
  {
    name: '02-racine-foyers',
    title: 'Racine Foyers',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${spacing.xl}px;">
          <div class="screen-title" style="margin-bottom:0;">Mes foyers</div>
          <div class="btn-ghost" style="font-size:14px;">Options</div>
        </div>
        <div class="card" style="margin-bottom:${spacing.md}px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div class="body-bold">Appartement démo</div>
              <div class="caption" style="margin-top:${spacing.xs}px;">2 membres · Standard</div>
            </div>
            <div style="color:${colors.textMuted};font-size:18px;">›</div>
          </div>
        </div>
        <div class="card" style="margin-bottom:${spacing.xl}px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div class="body-bold">Colocation démo</div>
              <div class="caption" style="margin-top:${spacing.xs}px;">3 membres · Pro</div>
            </div>
            <div style="color:${colors.textMuted};font-size:18px;">›</div>
          </div>
        </div>
        <div class="btn-secondary" style="width:100%;text-align:center;">+ Créer un foyer</div>
        <div style="margin-top:${spacing.xl}px;padding:${spacing.md}px;background:${colors.surfaceAlt};border-radius:${borderRadius.sm}px;text-align:center;">
          <span class="caption" style="color:${colors.textMuted};">✨ </span>
          <span class="caption" style="color:${colors.textSecondary};">Découvrir Premium</span>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab tab-active">🏠 Foyers</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '03-ajouter-premium',
    title: 'Ajouter Premium',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Ajouter une tâche</div>
        <div class="card">
          <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.md}px;">
            <span class="chip chip-active">🍽️ Vaisselle</span>
            <span class="chip chip-inactive">🛒 Courses</span>
            <span class="chip chip-inactive">🧹 Ménage</span>
          </div>
          <div class="form-group">
            <div class="form-label">Quoi ?</div>
            <input class="form-input" value="Vaisselle du soir" readonly>
          </div>
          <div class="form-group">
            <div class="form-label">Fait par</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Alex</span>
              <span class="chip chip-inactive">Sam</span>
            </div>
          </div>
          <div class="form-group">
            <div class="form-label">Fait pour</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Tout le monde</span>
              <span class="chip chip-inactive">Alex</span>
              <span class="chip chip-inactive">Sam</span>
            </div>
          </div>
          <div class="form-group">
            <div class="form-label">Durée</div>
            <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.md}px;">
              <span class="chip chip-active">Manuel</span>
              <span class="chip chip-inactive">Chrono</span>
            </div>
            <div class="duration-row">
              <input class="duration-input" value="1" readonly>
              <span class="duration-unit">h</span>
              <input class="duration-input" value="30" readonly>
              <span class="duration-unit">min</span>
            </div>
          </div>
          <div class="btn-primary" style="width:100%;text-align:center;margin-top:${spacing.md}px;">Valider</div>
        </div>

        <div class="section-title">Historique</div>
        <div class="card">
          <div class="row">
            <div class="row-label"><span class="body-bold">Vaisselle du soir</span> · <span class="metric" style="font-size:16px;">1h 30</span></div>
          </div>
          <div style="padding:${spacing.xs}px 0;">
            <span class="row-meta">Fait par Alex pour Tout le monde · 24 août</span>
          </div>
        </div>
        <div class="card">
          <div class="row">
            <div class="row-label"><span class="body-bold">Courses</span> · <span class="metric" style="font-size:16px;">45 min</span></div>
          </div>
          <div style="padding:${spacing.xs}px 0;">
            <span class="row-meta">Fait par Sam pour Tout le monde · 25 août</span>
          </div>
        </div>
        <div class="card">
          <div class="row">
            <div class="row-label"><span class="body-bold">Nettoyer le balcon</span> · <span class="metric" style="font-size:16px;">30 min</span></div>
          </div>
          <div style="padding:${spacing.xs}px 0;">
            <span class="row-meta">Fait par Sam pour Tout le monde · 26 août</span>
          </div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab tab-active">➕ Ajouter</div>
        <div class="tab">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '04-ajouter-free-archive',
    title: 'Ajouter Free + Archive',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Ajouter une tâche</div>

        <div class="archive-banner">
          <div style="display:flex;align-items:flex-start;">
            <span class="emoji">🌿</span>
            <div>
              <div class="body-bold" style="margin-bottom:${spacing.xs}px;">Nouveau mois</div>
              <div class="body" style="font-size:14px;color:${colors.textSecondary};">Ton historique précédent est bien au chaud. Avec ChoreScore Premium, tu peux le retrouver à tout moment.</div>
              <div class="btn-ghost" style="margin-top:${spacing.sm}px;padding-left:0;">Retrouver mon historique</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="form-group">
            <div class="form-label">Quoi ?</div>
            <input class="form-input" placeholder="Ex: Vaisselle, Courses..." readonly>
          </div>
          <div class="form-group">
            <div class="form-label">Fait par</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Alex</span>
              <span class="chip chip-inactive">Sam</span>
            </div>
          </div>
          <div class="form-group">
            <div class="form-label">Fait pour</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Tout le monde</span>
            </div>
          </div>
          <div class="btn-primary" style="width:100%;text-align:center;">Valider</div>
        </div>

        <div class="section-title">Historique — Septembre</div>
        <div class="card">
          <div class="row">
            <div class="row-label"><span class="body-bold">Cuisine septembre</span> · <span class="metric" style="font-size:16px;">20 min</span></div>
          </div>
          <div style="padding:${spacing.xs}px 0;">
            <span class="row-meta">Fait par Sam pour Tout le monde · 1 sept</span>
          </div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab tab-active">➕ Ajouter</div>
        <div class="tab">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '05-score-premium',
    title: 'Score Premium',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Score</div>
        <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.md}px;">
          <span class="chip chip-inactive">Semaine</span>
          <span class="chip chip-active">Mois</span>
          <span class="chip chip-inactive">Année</span>
          <span class="chip chip-inactive">Depuis le début</span>
        </div>
        <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.lg}px;">
          <span class="chip chip-active">Toutes</span>
          <span class="chip chip-inactive">Vaisselle</span>
          <span class="chip chip-inactive">Autres</span>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${spacing.md}px;">
            <div class="section-title" style="margin-bottom:0;">Équilibres</div>
            <span class="body" style="color:${colors.primary};">Partager</span>
          </div>
          <div class="caption" style="margin-bottom:${spacing.md}px;">Somme des soldes : 0 min</div>
          <div class="caption" style="margin-bottom:${spacing.sm}px;">Qui doit rattraper :</div>
          <div class="body" style="margin-bottom:${spacing.sm}px;padding-left:${spacing.sm}px;">
            Sam <span class="compensation-arrow">→</span> Alex : <span class="positive">15 min</span>
          </div>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-name">Alex</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:66%;background:${colors.success};">
                  <span class="bar-label">+15 min</span>
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-name">Sam</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:66%;background:${colors.error};">
                  <span class="bar-label">−15 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Temps effectué</div>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-name">Alex</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:100%;background:${colors.primary};">
                  <span class="bar-label">1h</span>
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-name">Sam</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:50%;background:${colors.primaryLight};">
                  <span class="bar-label" style="color:${colors.text};">30 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;margin:16px 0;">
          <div style="flex:1;height:1px;background:${colors.border};"></div>
          <span class="caption" style="margin:0 ${spacing.md}px;">Pondéré</span>
          <div style="flex:1;height:1px;background:${colors.border};"></div>
        </div>

        <div class="card">
          <div class="section-title">Équilibres pondérés</div>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-name">Alex</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:50%;background:${colors.success};">
                  <span class="bar-label">+7.5 min</span>
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-name">Sam</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:50%;background:${colors.error};">
                  <span class="bar-label">−7.5 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Historique</div>
          <div class="caption" style="margin-bottom:${spacing.sm}px;">Mois · Vaisselle</div>
          <div class="row">
            <div class="row-label"><span class="body-bold">Vaisselle du soir</span> · 1h 30</div>
          </div>
          <div style="padding:4px 0;"><span class="row-meta">Alex → Tout le monde · 24 août</span></div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab">➕ Ajouter</div>
        <div class="tab tab-active">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '06-score-free',
    title: 'Score Free',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Score</div>
        <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.md}px;">
          <span class="chip chip-inactive">Semaine</span>
          <span class="chip chip-active">Mois</span>
          <span class="chip chip-inactive" style="opacity:0.5;">Année 🔒</span>
          <span class="chip chip-inactive" style="opacity:0.5;">Depuis le début 🔒</span>
        </div>

        <div class="archive-banner" style="margin-bottom:${spacing.lg}px;">
          <div style="display:flex;align-items:flex-start;">
            <span class="emoji">🌿</span>
            <div>
              <div class="body" style="font-size:14px;color:${colors.textSecondary};">Nouveau mois — ton historique complet est disponible avec Premium.</div>
              <div class="btn-ghost" style="margin-top:${spacing.sm}px;padding-left:0;">Découvrir Premium</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${spacing.md}px;">
            <div class="section-title" style="margin-bottom:0;">Équilibres</div>
          </div>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-name">Alex</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:80%;background:${colors.success};">
                  <span class="bar-label">+20 min</span>
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-name">Sam</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:80%;background:${colors.error};">
                  <span class="bar-label">−20 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Temps effectué</div>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-name">Alex</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:100%;background:${colors.primary};">
                  <span class="bar-label">45 min</span>
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-name">Sam</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:44%;background:${colors.primaryLight};">
                  <span class="bar-label" style="color:${colors.text};">20 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Historique</div>
          <div class="row">
            <div class="row-label"><span class="body-bold">Entrée courante</span> · 20 min</div>
          </div>
          <div style="padding:4px 0;"><span class="row-meta">Alex → Tout le monde · 31 août</span></div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab">➕ Ajouter</div>
        <div class="tab tab-active">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '07-todo-premium',
    title: 'To-do Premium',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">To-do</div>
        <div class="btn-primary" style="width:100%;text-align:center;margin-bottom:${spacing.lg}px;">+ Nouvelle tâche</div>

        <div class="section-title">À faire</div>
        <div class="card">
          <div style="display:flex;gap:${spacing.md}px;align-items:flex-start;">
            <div class="todo-check"></div>
            <div style="flex:1;">
              <div class="body-bold" style="margin-bottom:${spacing.xs}px;">Sortir les cartons</div>
              <div style="display:flex;gap:${spacing.sm}px;align-items:center;">
                <span class="caption">Sam</span>
                <span class="caption">·</span>
                <span class="caption" style="color:${colors.primary};">Pas de date</span>
              </div>
            </div>
            <div style="color:${colors.textMuted};padding:${spacing.sm}px;">×</div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;gap:${spacing.md}px;align-items:flex-start;">
            <div class="todo-check"></div>
            <div style="flex:1;">
              <div class="body-bold" style="margin-bottom:${spacing.xs}px;">Passer l'aspirateur</div>
              <div style="display:flex;gap:${spacing.sm}px;align-items:center;">
                <span class="caption">Alex</span>
                <span class="caption">·</span>
                <span class="caption" style="color:${colors.primary};">Demain</span>
              </div>
              <div class="caption muted" style="margin-top:${spacing.xs}px;">Sous-sol et étage</div>
            </div>
            <div style="color:${colors.textMuted};padding:${spacing.sm}px;">×</div>
          </div>
        </div>

        <div class="section-title" style="margin-top:${spacing.lg}px;">Terminées</div>
        <div class="card" style="opacity:0.6;">
          <div style="display:flex;gap:${spacing.md}px;align-items:flex-start;">
            <div class="todo-check-done">✓</div>
            <div style="flex:1;">
              <div class="body-bold" style="margin-bottom:${spacing.xs}px;text-decoration:line-through;color:${colors.textMuted};">Ranger le garage</div>
              <div style="display:flex;gap:${spacing.sm}px;align-items:center;">
                <span class="caption">Alex</span>
                <span class="caption">·</span>
                <span class="caption">25 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab">➕ Ajouter</div>
        <div class="tab">📊 Score</div>
        <div class="tab tab-active">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '08-mini-form',
    title: 'Mini-form Complétion',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title" style="font-size:20px;">Tâche faite !</div>
        <div class="body" style="color:${colors.textSecondary};margin-bottom:${spacing.xl}px;">Sortir les cartons</div>

        <div class="card">
          <div class="form-group">
            <div class="form-label">Fait par</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Sam</span>
              <span class="chip chip-inactive">Alex</span>
            </div>
          </div>

          <div class="form-group">
            <div class="form-label">Durée réelle</div>
            <div class="duration-row">
              <input class="duration-input" value="0" readonly>
              <span class="duration-unit">h</span>
              <input class="duration-input" value="10" readonly>
              <span class="duration-unit">min</span>
            </div>
          </div>

          <div class="form-group">
            <div class="form-label">Fait pour</div>
            <div style="display:flex;gap:${spacing.sm}px;">
              <span class="chip chip-active">Tout le monde</span>
            </div>
          </div>

          <div class="btn-primary" style="width:100%;text-align:center;margin-top:${spacing.md}px;">Valider</div>
          <div class="btn-ghost" style="width:100%;text-align:center;">Annuler</div>
        </div>
      </div>
    `),
  },
  {
    name: '09-todo-free',
    title: 'To-do Free',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">To-do</div>

        <div class="upsell-card">
          <div class="section-title" style="margin-bottom:${spacing.sm}px;">Planification Premium</div>
          <div class="body" style="color:${colors.textSecondary};margin-bottom:${spacing.md}px;">Crée des tâches à planifier, assigne-les et suis leur réalisation.</div>
          <div class="btn-secondary" style="text-align:center;display:inline-block;">Découvrir Premium</div>
        </div>

        <div class="empty-state">
          <div class="emoji">📋</div>
          <div class="body" style="color:${colors.textSecondary};">Aucune tâche. La planification fait partie de Premium.</div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab">➕ Ajouter</div>
        <div class="tab">📊 Score</div>
        <div class="tab tab-active">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '10-upsell-historique',
    title: 'Upsell Historique',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Score</div>
        <div style="display:flex;gap:${spacing.sm}px;margin-bottom:${spacing.md}px;">
          <span class="chip chip-inactive">Semaine</span>
          <span class="chip chip-inactive">Mois</span>
          <span class="chip chip-active">Année</span>
          <span class="chip chip-inactive">Depuis le début</span>
        </div>

        <div class="card" style="border-left:3px solid ${colors.primary};">
          <div class="section-title" style="margin-bottom:${spacing.sm}px;">Fonctionnalité Premium</div>
          <div class="body" style="color:${colors.textSecondary};margin-bottom:${spacing.md}px;">
            L'historique annuel nécessite ChoreScore Premium.
          </div>
          <div style="display:flex;gap:${spacing.md}px;align-items:center;">
            <div class="btn-primary" style="text-align:center;">Découvrir Premium</div>
            <div class="btn-ghost">Retour</div>
          </div>
        </div>

        <div style="margin-top:${spacing.xl}px;text-align:center;">
          <div class="caption muted">Essai complet 30 jours · Sans engagement</div>
          <div style="margin-top:${spacing.md}px;display:flex;gap:${spacing.sm}px;justify-content:center;">
            <div class="chip chip-inactive" style="padding:${spacing.md}px ${spacing.xl}px;">
              <div class="body-bold" style="color:${colors.primary};">Standard</div>
              <div class="caption">2,99 €/mois</div>
            </div>
            <div class="chip chip-inactive" style="padding:${spacing.md}px ${spacing.xl}px;">
              <div class="body-bold" style="color:${colors.primary};">Pro</div>
              <div class="caption">5,99 €/mois</div>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab">➕ Ajouter</div>
        <div class="tab tab-active">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
  {
    name: '11-options',
    title: 'Options',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Options</div>

        <div class="settings-section">
          <div class="settings-title">Compte / Personnel</div>
          <div class="card">
            <div class="settings-row">
              <span class="body">Alex</span>
              <span class="caption muted">alex@example.com</span>
            </div>
            <div class="settings-row">
              <span class="body">Mon nom</span>
              <span class="caption muted">Alex ›</span>
            </div>
            <div class="settings-row">
              <span class="body">Notifications</span>
              <span class="caption muted">Activées ›</span>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Confidentialité / Données</div>
          <div class="card">
            <div class="settings-row">
              <span class="body">Recherche & analytics</span>
              <span class="caption muted">Désactivées ›</span>
            </div>
            <div class="settings-row">
              <span class="body">Exporter mes données</span>
              <span class="caption muted">›</span>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Abonnement — Appartement démo</div>
          <div class="card card-highlight">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div class="body-bold" style="color:${colors.primary};">Standard</div>
                <div class="caption" style="margin-top:${spacing.xs}px;">2,99 €/mois · 2 membres</div>
              </div>
              <div class="btn-ghost" style="font-size:14px;">Gérer</div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Légal</div>
          <div class="card">
            <div class="settings-row">
              <span class="body">Conditions d'utilisation</span>
              <span class="caption muted">›</span>
            </div>
            <div class="settings-row">
              <span class="body">Politique de confidentialité</span>
              <span class="caption muted">›</span>
            </div>
          </div>
        </div>

        <div style="text-align:center;margin-top:${spacing.xl}px;">
          <div class="btn-ghost" style="color:${colors.error};">Se déconnecter</div>
        </div>
      </div>
    `),
  },
  {
    name: '12-share-card',
    title: 'Share Card',
    html: htmlShell(`
      <div class="screen" style="display:flex;align-items:center;justify-content:center;min-height:${SCREEN_HEIGHT - 100}px;background:${colors.background};">
        <div class="share-card">
          <div class="share-card-header">
            <span class="share-card-brand">ChoreScore</span>
            <span class="caption">Mois</span>
          </div>
          <div class="caption muted" style="margin-bottom:${spacing.sm}px;">Appartement démo</div>
          <div style="margin-bottom:${spacing.md}px;">
            <div style="display:flex;justify-content:space-between;padding:${spacing.xs}px 0;">
              <span class="body">Alex</span>
              <span class="body-bold positive">+2h</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:${spacing.xs}px 0;">
              <span class="body">Sam</span>
              <span class="body-bold negative">−2h</span>
            </div>
          </div>
          <div style="padding-top:${spacing.sm}px;border-top:1px solid ${colors.divider};">
            <div class="caption muted" style="margin-bottom:${spacing.xs}px;">Temps effectué</div>
            <div style="display:flex;justify-content:space-between;padding:${spacing.xs}px 0;">
              <span class="body">Alex</span>
              <span class="body-bold">3h</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:${spacing.xs}px 0;">
              <span class="body">Sam</span>
              <span class="body-bold">1h</span>
            </div>
          </div>
          <div class="share-card-footer">fait avec ♡ par ChoreScore</div>
        </div>
      </div>
    `),
  },
  {
    name: '13-empty-states',
    title: 'Empty States',
    html: htmlShell(`
      <div class="status-bar">9:41</div>
      <div class="screen">
        <div class="screen-title">Ajouter une tâche</div>

        <div class="card">
          <div class="form-group">
            <div class="form-label">Quoi ?</div>
            <input class="form-input" placeholder="Ex: Vaisselle, Courses..." readonly>
          </div>
          <div class="btn-primary" style="width:100%;text-align:center;">Valider</div>
        </div>

        <div class="section-title">Historique</div>
        <div class="empty-state">
          <div class="emoji">🏠</div>
          <div class="body" style="color:${colors.textSecondary};margin-bottom:${spacing.sm}px;">Aucune tâche enregistrée.</div>
          <div class="body" style="color:${colors.textSecondary};">Ajoute ta première réalisation !</div>
        </div>
      </div>
      <div class="tab-bar">
        <div class="tab tab-active">➕ Ajouter</div>
        <div class="tab">📊 Score</div>
        <div class="tab">📋 To-do</div>
      </div>
      <div class="home-indicator"><div class="home-indicator-bar"></div></div>
    `),
  },
];

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const outDir = path.join(__dirname, '..', 'audit', 'visual-evidence');
  fs.mkdirSync(outDir, { recursive: true });

  const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

  console.log(`Launching Chromium from ${chromiumPath}...`);
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, deviceScaleFactor: 2 });

  const results = [];

  for (const screen of screens) {
    const outPath = path.join(outDir, `${screen.name}.png`);

    await page.setContent(screen.html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    // Small delay to allow CSS rendering to settle
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: outPath, fullPage: true, type: 'png' });

    const stats = fs.statSync(outPath);
    results.push({ name: screen.name, title: screen.title, path: outPath, bytes: stats.size });
    console.log(`  ✓ ${screen.name}.png (${stats.size} bytes)`);
  }

  await browser.close();

  // Write manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/generate-visual-evidence.js',
    designSystemSource: 'src/ui/design-system/theme.ts',
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    deviceScaleFactor: 2,
    screens: results.map(r => ({
      name: r.name,
      title: r.title,
      file: `${r.name}.png`,
      bytes: r.bytes,
    })),
  };

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nGenerated ${results.length} screens in ${outDir}`);
  console.log(`Manifest written to ${path.join(outDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error('Visual evidence generation failed:', err);
  process.exit(1);
});
