const nav = document.querySelector('.nav');
const burger = document.querySelector('.burger');
const themeToggle = document.querySelector('.theme-toggle');
const projectsGrid = document.getElementById('projectsGrid');
const searchInput = document.getElementById('search');
const typeFilter = document.getElementById('typeFilter');

const state = {
  projects: [],
  filtered: [],
  theme: 'light'
};

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  localStorage.setItem('portfolio-theme', theme);
  state.theme = theme;
}

function loadTheme() {
  const saved = localStorage.getItem('portfolio-theme');
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
}

function toggleNav() {
  const isOpen = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', isOpen);
}

function closeNav() {
  nav.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
}

function smoothScrollSetup() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        closeNav();
      }
    });
  });
}

function createProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'card project-card reveal col-12 justify-between';
  card.dataset.type = project.type;

  const header = document.createElement('div');
  header.className = 'project-header';
  header.innerHTML = `<h3 class="m-0">${project.title}</h3><p class="m-0 project-type">${project.type}</p>`;

  const meta = document.createElement('div');
  meta.className = 'project-meta';
  meta.innerHTML = project.tags.map((tag) => `<span>${tag}</span>`).join('');

  const description = document.createElement('p');
  description.className = 'project-description';
  description.textContent = project.description;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-secondary';
  toggle.textContent = 'En savoir plus';
  toggle.addEventListener('click', () => {
    description.classList.toggle('is-visible');
    toggle.textContent = description.classList.contains('is-visible') ? 'Masquer' : 'En savoir plus';
  });

  card.append(header, meta, toggle, description);
  return card;
}

function renderProjects(projects) {
  projectsGrid.innerHTML = '';
  if (!projects.length) {
    projectsGrid.innerHTML = '<p>Aucun projet trouvé.</p>';
    return;
  }
  projects.forEach((project) => {
    projectsGrid.appendChild(createProjectCard(project));
  });
  observeReveal();
}

function updateFilters() {
  const term = searchInput.value.toLowerCase();
  const type = typeFilter.value;
  const filtered = state.projects.filter((project) => {
    const matchesType = type === 'all' || project.type === type;
    const matchesText = [project.title, project.description, project.type]
      .some((field) => field.toLowerCase().includes(term));
    return matchesType && matchesText;
  });
  state.filtered = filtered;
  renderProjects(filtered);
}

async function loadProjects() {
  try {
    const res = await fetch('./data/projects.json');
    const data = await res.json();
    state.projects = data.projects;
    const types = Array.from(new Set(state.projects.map((p) => p.type)));
    types.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeFilter.appendChild(option);
    });
    updateFilters();
  } catch (err) {
    projectsGrid.innerHTML = '<p>Impossible de charger les projets.</p>';
    console.error(err);
  }
}

function observeReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((section) => observer.observe(section));
}

function setupContactForm() {
  const form = document.querySelector('.contact-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('Formulaire non fonctionnel dans cette version.');
  });
}

function init() {
  loadTheme();
  observeReveal();
  smoothScrollSetup();
  setupContactForm();
  loadProjects();

  burger.addEventListener('click', toggleNav);
  themeToggle.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
  searchInput.addEventListener('input', updateFilters);
  typeFilter.addEventListener('change', updateFilters);
}

init();
