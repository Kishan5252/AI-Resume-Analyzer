/* =========================================================
   ResumeIQ — AI Resume Analyzer
   All interactivity in one file.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. HELPERS
     --------------------------------------------------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const rand = (min, max) => Math.random() * (max - min) + min;

  /* ---------------------------------------------------------
     1. FOOTER YEAR
     --------------------------------------------------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     2. NAVBAR — scroll state + mobile toggle
     --------------------------------------------------------- */
  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');

  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Close mobile menu on link click
  $$('.nav__link, .nav__cta').forEach((a) => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Active link highlight on scroll
  const sections = $$('section[id]');
  const links = $$('.nav__link');

  const highlightNav = () => {
    const pos = window.scrollY + 140;
    let current = '';
    sections.forEach((s) => {
      if (pos >= s.offsetTop) current = s.id;
    });
    links.forEach((l) => {
      l.classList.toggle('is-active', l.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  /* ---------------------------------------------------------
     3. REVEAL ON SCROLL
     --------------------------------------------------------- */
  const revealEls = $$('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('is-visible'), i * 70);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------
     4. ANIMATED COUNTERS
     --------------------------------------------------------- */
  const counters = $$('[data-count]');

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    const duration = 1800;
    const start = performance.now();

    const tick = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = Math.floor(eased * target);

      if (target >= 10000) {
        el.textContent = value.toLocaleString('en-US') + '+';
      } else {
        el.textContent = value.toLocaleString('en-US');
      }

      if (progress < 1) requestAnimationFrame(tick);
      else {
        el.textContent =
          target >= 10000
            ? target.toLocaleString('en-US') + '+'
            : target.toLocaleString('en-US');
      }
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => counterObserver.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------------------------------------------------------
     5. ANALYZER — ELEMENTS
     --------------------------------------------------------- */
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const browseBtn = $('#browseBtn');
  const fileInfo = $('#fileInfo');
  const fileName = $('#fileName');
  const fileSize = $('#fileSize');
  const removeFileBtn = $('#removeFile');
  const analyzeBtn = $('#analyzeBtn');
  const roleSelect = $('#roleSelect');

  const statusBadge = $('#statusBadge');
  const resultEmpty = $('#resultEmpty');
  const resultLoading = $('#resultLoading');
  const resultData = $('#resultData');

  const progressBar = $('#progressBar');
  const stepsList = $('#stepsList');

  const scoreCircle = $('#scoreCircle');
  const scoreValue = $('#scoreValue');
  const gradeTitle = $('#gradeTitle');
  const gradeText = $('#gradeText');
  const gradeChips = $('#gradeChips');
  const metricsWrap = $('#metrics');
  const matchedSkills = $('#matchedSkills');
  const missingSkills = $('#missingSkills');
  const suggestionsList = $('#suggestions');
  const sectionsWrap = $('#sections');

  const downloadBtn = $('#downloadBtn');
  const resetBtn = $('#resetBtn');

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'txt'];

  let selectedFile = null;
  let lastReport = null;
  let analyzing = false;

  /* ---------------------------------------------------------
     6. ROLE KEYWORD LIBRARY
     --------------------------------------------------------- */
  const ROLE_DATA = {
    general: {
      label: 'General',
      skills: ['Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Leadership', 'Adaptability', 'Critical Thinking', 'Project Management', 'Microsoft Office', 'Collaboration']
    },
    frontend: {
      label: 'Frontend Developer',
      skills: ['JavaScript', 'TypeScript', 'React', 'Vue', 'HTML5', 'CSS3', 'Responsive Design', 'REST APIs', 'Git', 'Webpack', 'Accessibility', 'Performance Optimization', 'Testing', 'Redux']
    },
    backend: {
      label: 'Backend Developer',
      skills: ['Node.js', 'Python', 'Java', 'SQL', 'PostgreSQL', 'MongoDB', 'REST APIs', 'Docker', 'Microservices', 'Redis', 'Authentication', 'AWS', 'CI/CD', 'System Design']
    },
    fullstack: {
      label: 'Full Stack Developer',
      skills: ['JavaScript', 'React', 'Node.js', 'Express', 'SQL', 'MongoDB', 'REST APIs', 'Git', 'Docker', 'TypeScript', 'HTML5', 'CSS3', 'AWS', 'Testing']
    },
    data: {
      label: 'Data Analyst / Scientist',
      skills: ['Python', 'SQL', 'Pandas', 'NumPy', 'Machine Learning', 'Data Visualization', 'Tableau', 'Power BI', 'Statistics', 'Excel', 'Scikit-learn', 'ETL', 'A/B Testing', 'TensorFlow']
    },
    designer: {
      label: 'UI/UX Designer',
      skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Usability Testing', 'Interaction Design', 'Adobe XD', 'Accessibility', 'Typography', 'User Flows', 'Sketch', 'Information Architecture']
    },
    pm: {
      label: 'Product Manager',
      skills: ['Roadmapping', 'User Stories', 'Agile', 'Scrum', 'Stakeholder Management', 'Analytics', 'A/B Testing', 'Market Research', 'Jira', 'KPIs', 'Product Strategy', 'Prioritization', 'SQL']
    },
    marketing: {
      label: 'Digital Marketing',
      skills: ['SEO', 'SEM', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing', 'PPC', 'Copywriting', 'CRM', 'Conversion Optimization', 'Brand Strategy', 'Google Ads', 'Meta Ads']
    }
  };

  const SUGGESTION_POOL = {
    low: [
      '<b>Add measurable results</b> — turn "responsible for X" into "increased X by 30% in 6 months".',
      '<b>Use standard section headings</b> like "Experience", "Education" and "Skills" so ATS parsers recognise them.',
      '<b>Remove tables, columns and text boxes</b> — they scramble the reading order in most applicant tracking systems.',
      '<b>Start every bullet with a strong action verb</b> such as Led, Built, Shipped, Improved or Reduced.',
      '<b>Include a dedicated Skills section</b> with the exact tools and technologies from the job description.',
      '<b>Keep your resume to one or two pages</b> — recruiters spend roughly 7 seconds on the first pass.'
    ],
    mid: [
      '<b>Mirror the job description language</b> — use the same terms the employer uses for tools and responsibilities.',
      '<b>Quantify at least 60% of your bullet points</b> with numbers, percentages or timeframes.',
      '<b>Tighten your summary</b> to 2–3 lines that state your role, years of experience and biggest win.',
      '<b>Move your strongest achievements to the top</b> of each role so they are seen first.',
      '<b>Add a link to your portfolio or GitHub</b> in the contact line for easy verification.'
    ],
    high: [
      '<b>Your formatting is ATS-safe.</b> Keep avoiding images, icons and multi-column layouts.',
      '<b>Consider adding one or two advanced keywords</b> from the job post to push your match even higher.',
      '<b>Tailor the summary line per application</b> — small wording changes lift relevance scores noticeably.',
      '<b>Double-check date formats</b> are consistent (e.g. "Jan 2022 – Present") across every role.'
    ]
  };

  /* ---------------------------------------------------------
     7. FILE HANDLING
     --------------------------------------------------------- */
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getExt = (name) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  const setFile = (file) => {
    if (!file) return;

    const ext = getExt(file.name);

    if (!ALLOWED_EXT.includes(ext)) {
      showToast('Please upload a PDF, DOC, DOCX or TXT file.');
      return;
    }

    if (file.size > MAX_SIZE) {
      showToast('File is too large. Maximum size is 5 MB.');
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    fileInfo.hidden = false;
    analyzeBtn.disabled = false;

    // Reset the report area if a previous run happened
    if (lastReport && !analyzing) resetReport();
  };

  const clearFile = () => {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.hidden = true;
    analyzeBtn.disabled = true;
  };

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setFile(file);
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('is-drag');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (evt === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
      dropzone.classList.remove('is-drag');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) setFile(dt.files[0]);
  });

  // Prevent the browser from opening dropped files elsewhere
  ['dragover', 'drop'].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if (!dropzone.contains(e.target)) e.preventDefault();
    });
  });

  /* ---------------------------------------------------------
     8. SIMPLE TOAST
     --------------------------------------------------------- */
  let toastTimer = null;

  function showToast(message) {
    let toast = $('#rqToast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'rqToast';
      toast.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:28px',
        'transform:translateX(-50%) translateY(20px)',
        'background:rgba(11,17,32,0.97)',
        'border:1px solid rgba(251,113,133,0.4)',
        'color:#eef2fb',
        'padding:13px 20px',
        'border-radius:12px',
        'font-size:0.86rem',
        'font-weight:600',
        'z-index:9999',
        'opacity:0',
        'transition:opacity .3s ease, transform .3s ease',
        'box-shadow:0 20px 50px -20px rgba(0,0,0,0.9)',
        'max-width:calc(100vw - 40px)',
        'text-align:center'
      ].join(';');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3200);
  }

  /* ---------------------------------------------------------
     9. STATE SWITCHING
     --------------------------------------------------------- */
  function showState(state) {
    resultEmpty.hidden = state !== 'empty';
    resultLoading.hidden = state !== 'loading';
    resultData.hidden = state !== 'data';
  }

  function setBadge(text, variant) {
    statusBadge.textContent = text;
    statusBadge.className = 'badge' + (variant ? ' badge--' + variant : '');
  }

  /* ---------------------------------------------------------
     10. SCORING ENGINE (deterministic, based on file + role)
     --------------------------------------------------------- */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  // Seeded pseudo-random generator so the same file gives the same report
  function makeRng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function buildReport(file, roleKey) {
    const role = ROLE_DATA[roleKey] || ROLE_DATA.general;
    const seed = hashString(file.name + '|' + file.size + '|' + roleKey);
    const rng = makeRng(seed);

    // --- Sub-scores (each 0-100) ---
    const keywordScore = Math.round(clamp(52 + rng() * 46, 40, 99));
    const formatScore = Math.round(clamp(62 + rng() * 36, 45, 99));
    const impactScore = Math.round(clamp(48 + rng() * 46, 35, 97));
    const readabilityScore = Math.round(clamp(66 + rng() * 32, 50, 99));
    const sectionScore = Math.round(clamp(70 + rng() * 29, 55, 100));

    const overall = Math.round(
      keywordScore * 0.32 +
        formatScore * 0.22 +
        impactScore * 0.2 +
        readabilityScore * 0.13 +
        sectionScore * 0.13
    );

    // --- Keyword split ---
    const allSkills = role.skills.slice();
    // shuffle deterministically
    for (let i = allSkills.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allSkills[i], allSkills[j]] = [allSkills[j], allSkills[i]];
    }

    const matchRatio = keywordScore / 100;
    const matchCount = clamp(Math.round(allSkills.length * matchRatio), 2, allSkills.length - 1);
    const matched = allSkills.slice(0, matchCount);
    const missing = allSkills.slice(matchCount, Math.min(allSkills.length, matchCount + 6));

    // --- Metrics ---
    const metrics = [
      { label: 'Keyword Match', value: keywordScore },
      { label: 'ATS Formatting', value: formatScore },
      { label: 'Impact & Achievements', value: impactScore },
      { label: 'Readability', value: readabilityScore }
    ];

    // --- Grade ---
    let grade, gradeCopy, chips;
    if (overall >= 85) {
      grade = 'Excellent Match';
      gradeCopy = 'Your resume is highly competitive and ATS-ready. Fine-tune the details below to stay at the top.';
      chips = ['ATS Ready', 'Strong Keywords', 'Recruiter Friendly'];
    } else if (overall >= 70) {
      grade = 'Good Match';
      gradeCopy = 'Your resume is competitive but has clear room to improve. Fix the flagged items to lift your score.';
      chips = ['Solid Base', 'Needs Tuning', 'Almost There'];
    } else if (overall >= 55) {
      grade = 'Fair Match';
      gradeCopy = 'Several issues are holding your resume back. Work through the suggestions below in order.';
      chips = ['Needs Work', 'Keyword Gaps', 'Formatting Risks'];
    } else {
      grade = 'Needs Improvement';
      gradeCopy = 'Your resume is likely being filtered out before a human sees it. Start with the high-priority fixes.';
      chips = ['High Priority', 'Likely Filtered', 'Rework Needed'];
    }

    // --- Suggestions ---
    const pool =
      overall >= 85 ? SUGGESTION_POOL.high : overall >= 65 ? SUGGESTION_POOL.mid : SUGGESTION_POOL.low;

    const suggestions = pool.slice();
    // Add a keyword-specific suggestion if missing keywords exist
    if (missing.length) {
      suggestions.unshift(
        '<b>Add these missing keywords</b> where they genuinely apply: ' +
          missing.slice(0, 4).join(', ') +
          '.'
      );
    }

    // --- Sections ---
    const sectionDefs = [
      { name: 'Contact Info', always: true },
      { name: 'Professional Summary', always: false },
      { name: 'Work Experience', always: true },
      { name: 'Education', always: true },
      { name: 'Skills', always: true },
      { name: 'Projects', always: false },
      { name: 'Certifications', always: false }
    ];

    const sections = sectionDefs.map((s) => {
      const present = s.always ? true : rng() > 0.42;
      return { name: s.name, present };
    });

    return {
      fileName: file.name,
      roleLabel: role.label,
      overall,
      metrics,
      grade,
      gradeCopy,
      chips,
      matched,
      missing,
      suggestions: suggestions.slice(0, 6),
      sections
    };
  }

  /* ---------------------------------------------------------
     11. ANIMATE THE SCORE RING
     --------------------------------------------------------- */
  const RING_CIRCUMFERENCE = 2 * Math.PI * 70; // r = 70 → ≈ 439.82

  function animateScore(target) {
    // Set stroke colour by score band
    let colour = '#fb7185';
    if (target >= 85) colour = '#34d399';
    else if (target >= 70) colour = '#5b7cfa';
    else if (target >= 55) colour = '#fbbf24';

    scoreCircle.style.stroke = colour;

    // Ring
    const offset = RING_CIRCUMFERENCE * (1 - target / 100);
    scoreCircle.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    scoreCircle.style.strokeDashoffset = String(RING_CIRCUMFERENCE);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scoreCircle.style.strokeDashoffset = String(offset);
      });
    });

    // Number count-up
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      scoreValue.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
      else scoreValue.textContent = target;
    };
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------
     12. RENDER THE REPORT
     --------------------------------------------------------- */
  function renderReport(report) {
    lastReport = report;

    // Header / grade
    gradeTitle.textContent = report.grade;
    gradeText.textContent = report.gradeCopy;

    gradeChips.innerHTML = '';
    report.chips.forEach((c) => {
      const span = document.createElement('span');
      span.textContent = c;
      gradeChips.appendChild(span);
    });

    // Metrics
    metricsWrap.innerHTML = '';
    report.metrics.forEach((m, i) => {
      let cls = 'metric--good';
      if (m.value < 55) cls = 'metric--bad';
      else if (m.value < 75) cls = 'metric--warn';

      const div = document.createElement('div');
      div.className = 'metric ' + cls;
      div.innerHTML =
        '<div class="metric__top"><span>' +
        m.label +
        '</span><b>' +
        m.value +
        '%</b></div>' +
        '<div class="metric__bar"><i></i></div>';

      metricsWrap.appendChild(div);

      // Animate the bar shortly after insertion
      const bar = $('i', div);
      setTimeout(() => {
        bar.style.width = m.value + '%';
      }, 120 + i * 110);
    });

    // Matched keywords
    matchedSkills.innerHTML = '';
    report.matched.forEach((k) => {
      const s = document.createElement('span');
      s.textContent = k;
      matchedSkills.appendChild(s);
    });

    // Missing keywords
    missingSkills.innerHTML = '';
    report.missing.forEach((k) => {
      const s = document.createElement('span');
      s.textContent = k;
      missingSkills.appendChild(s);
    });

    // Suggestions
    suggestionsList.innerHTML = '';
    report.suggestions.forEach((text) => {
      const li = document.createElement('li');
      li.innerHTML = text;
      suggestionsList.appendChild(li);
    });

    // Sections
    sectionsWrap.innerHTML = '';
    report.sections.forEach((sec) => {
      const div = document.createElement('div');
      div.className = 'section-item ' + (sec.present ? 'section-item--ok' : 'section-item--miss');

      const icon = sec.present
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

      div.innerHTML = icon + '<span>' + sec.name + '</span>';
      sectionsWrap.appendChild(div);
    });

    showState('data');
    animateScore(report.overall);
  }

  /* ---------------------------------------------------------
     13. RUN THE ANALYSIS
     --------------------------------------------------------- */
  const STEP_DURATION = 780;

  function runAnalysis() {
    if (!selectedFile || analyzing) return;

    analyzing = true;
    analyzeBtn.disabled = true;
    $('#analyzeBtn .btn__label').textContent = 'Analyzing…';

    setBadge('Analyzing', 'work');
    showState('loading');

    // Reset loading UI
    progressBar.style.width = '0%';
    const stepEls = $$('#stepsList li');
    stepEls.forEach((li) => li.classList.remove('is-active', 'is-done'));

    const roleKey = roleSelect.value;
    const report = buildReport(selectedFile, roleKey);

    let step = 0;

    const advance = () => {
      if (step > 0 && stepEls[step - 1]) {
        stepEls[step - 1].classList.remove('is-active');
        stepEls[step - 1].classList.add('is-done');
      }

      if (step < stepEls.length) {
        stepEls[step].classList.add('is-active');
        progressBar.style.width = Math.round(((step + 1) / stepEls.length) * 100) + '%';
        step++;
        setTimeout(advance, STEP_DURATION);
      } else {
        // Small settle delay before showing the report
        setTimeout(() => {
          renderReport(report);
          setBadge('Complete', 'done');
          analyzing = false;
          analyzeBtn.disabled = false;
          $('#analyzeBtn .btn__label').textContent = 'Analyze Resume';
          showToast('Analysis complete — scroll the report below.');
        }, 340);
      }
    };

    advance();
  }

  analyzeBtn.addEventListener('click', runAnalysis);

  /* ---------------------------------------------------------
     14. RESET
     --------------------------------------------------------- */
  function resetReport() {
    lastReport = null;
    showState('empty');
    setBadge(selectedFile ? 'Ready to analyze' : 'Awaiting file');
    progressBar.style.width = '0%';
    $$('#stepsList li').forEach((li) => li.classList.remove('is-active', 'is-done'));
    scoreCircle.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    scoreValue.textContent = '0';
    metricsWrap.innerHTML = '';
    matchedSkills.innerHTML = '';
    missingSkills.innerHTML = '';
    suggestionsList.innerHTML = '';
    sectionsWrap.innerHTML = '';
  }

  resetBtn.addEventListener('click', () => {
    clearFile();
    resetReport();
    setBadge('Awaiting file');
    // Scroll the upload card into view on small screens
    if (window.innerWidth < 1024) {
      $('#analyzer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* ---------------------------------------------------------
     15. DOWNLOAD REPORT AS .TXT
     --------------------------------------------------------- */
  downloadBtn.addEventListener('click', () => {
    if (!lastReport) return;

    const r = lastReport;
    const line = '='.repeat(58);

    const lines = [
      'ResumeIQ — AI Resume Analysis Report',
      line,
      'File        : ' + r.fileName,
      'Target role : ' + r.roleLabel,
      'Generated   : ' + new Date().toLocaleString(),
      line,
      '',
      'OVERALL SCORE: ' + r.overall + '/100  —  ' + r.grade,
      r.gradeCopy,
      '',
      'SUB-SCORES',
      '-'.repeat(58)
    ];

    r.metrics.forEach((m) => {
      lines.push('  ' + m.label.padEnd(28, '.') + ' ' + m.value + '%');
    });

    lines.push('');
    lines.push('MATCHED KEYWORDS');
    lines.push('-'.repeat(58));
    lines.push('  ' + (r.matched.join(', ') || 'None'));

    lines.push('');
    lines.push('MISSING KEYWORDS');
    lines.push('-'.repeat(58));
    lines.push('  ' + (r.missing.join(', ') || 'None — great coverage!'));

    lines.push('');
    lines.push('AI SUGGESTIONS');
    lines.push('-'.repeat(58));
    r.suggestions.forEach((s, i) => {
      const clean = s.replace(/<[^>]+>/g, '');
      lines.push('  ' + (i + 1) + '. ' + clean);
    });

    lines.push('');
    lines.push('SECTIONS DETECTED');
    lines.push('-'.repeat(58));
    r.sections.forEach((s) => {
      lines.push('  [' + (s.present ? 'x' : ' ') + '] ' + s.name);
    });

    lines.push('');
    lines.push(line);
    lines.push('Generated by ResumeIQ. Estimates for guidance only.');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ResumeIQ-Report-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Report downloaded.');
  });

  /* ---------------------------------------------------------
     16. SMOOTH ANCHOR SCROLL (with sticky-nav offset)
     --------------------------------------------------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const navH = nav.offsetHeight || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navH + 2;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------------------------------------------------------
     17. MOCK HERO RING — re-trigger on load
     --------------------------------------------------------- */
  window.addEventListener('load', () => {
    const mockRing = $('.ring__value');
    if (mockRing) {
      mockRing.style.animation = 'none';
      void mockRing.offsetWidth;
      mockRing.style.animation = '';
    }
  });

})();