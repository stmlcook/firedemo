(function () {
  const STORAGE_KEY = "rangerTrialStationJudgeHub.v1";

  const STATIONS = {
    fire: {
      label: "Fire (String Burn)",
      objective:
        "Score from two timers: fire build time + ignition-to-string-break time, plus teamwork and safety.",
      usesTargets: false,
      timerMode: "dual-fire"
    },
    range: {
      label: "BB Gun (Clay Pigeons)",
      objective:
        "Break as many clays as possible. Skill points are auto-calculated from targets hit and targets available.",
      usesTargets: true,
      timerMode: "none"
    },
    tripod: {
      label: "Tripod Build",
      objective: "Time the tripod build. Skill starts at 6 and drops by 1 point every 2 minutes.",
      usesTargets: false,
      timerMode: "single"
    }
  };

  const dom = {
    status: document.getElementById("status-banner"),
    navButtons: Array.from(document.querySelectorAll(".nav-btn")),
    views: {
      home: document.getElementById("home-view"),
      station: document.getElementById("station-view"),
      compile: document.getElementById("compile-view")
    },
    heroJudge: document.getElementById("hero-judge"),
    heroTeamKey: document.getElementById("hero-team-key"),

    setupForm: document.getElementById("setup-form"),
    judgeName: document.getElementById("judge-name"),
    teamsInput: document.getElementById("teams-input"),
    teamCount: document.getElementById("team-count"),
    teamKey: document.getElementById("team-key"),
    clearAllBtn: document.getElementById("clear-all-btn"),

    stationTabs: document.getElementById("station-tabs"),
    stationTitle: document.getElementById("station-title"),
    stationObjective: document.getElementById("station-objective"),
    teamSelect: document.getElementById("score-team"),
    copySummaryBtn: document.getElementById("copy-station-summary"),

    fireTimersBox: document.getElementById("fire-timers-box"),
    fireFullSkillSeconds: document.getElementById("fire-full-skill-seconds"),
    fireZeroSkillSeconds: document.getElementById("fire-zero-skill-seconds"),

    singleTimerBox: document.getElementById("single-timer-box"),
    timingNote: document.getElementById("timing-note"),
    timerDisplay: document.getElementById("timer-display"),
    capturedTime: document.getElementById("captured-time"),
    timerStart: document.getElementById("timer-start"),
    timerStop: document.getElementById("timer-stop"),
    timerReset: document.getElementById("timer-reset"),
    timerCapture: document.getElementById("timer-capture"),

    fireBuildDisplay: document.getElementById("fire-build-display"),
    fireBuildCaptured: document.getElementById("fire-build-captured"),
    fireBuildStart: document.getElementById("fire-build-start"),
    fireBuildStop: document.getElementById("fire-build-stop"),
    fireBuildReset: document.getElementById("fire-build-reset"),
    fireBuildCapture: document.getElementById("fire-build-capture"),

    fireBurnDisplay: document.getElementById("fire-burn-display"),
    fireBurnCaptured: document.getElementById("fire-burn-captured"),
    fireBurnStart: document.getElementById("fire-burn-start"),
    fireBurnStop: document.getElementById("fire-burn-stop"),
    fireBurnReset: document.getElementById("fire-burn-reset"),
    fireBurnCapture: document.getElementById("fire-burn-capture"),

    scoreForm: document.getElementById("score-form"),
    skillLabel: document.getElementById("skill-label"),
    scoreSkill: document.getElementById("score-skill"),
    scoreTeamwork: document.getElementById("score-teamwork"),
    scoreSafety: document.getElementById("score-safety"),
    scoreSkillValue: document.getElementById("score-skill-value"),
    scoreTeamworkValue: document.getElementById("score-teamwork-value"),
    scoreSafetyValue: document.getElementById("score-safety-value"),
    scoreTotal: document.getElementById("score-total"),

    rangeTargetsBox: document.getElementById("range-targets-box"),
    rangeTargetsHit: document.getElementById("range-targets-hit"),
    rangeTargetsPossible: document.getElementById("range-targets-possible"),

    detailHeader: document.getElementById("detail-header"),
    stationResultsBody: document.getElementById("station-results-body"),

    compileBody: document.getElementById("compile-body"),
    rankingBody: document.getElementById("ranking-body"),
    fillLocalScores: document.getElementById("fill-local-scores")
  };

  let state = loadState();
  let currentStation = "fire";

  const singleTimer = createTimerState();
  const fireBuildTimer = createTimerState();
  const fireBurnTimer = createTimerState();

  init();

  function init() {
    bindEvents();
    renderHome();
    renderStationTabs();
    renderStationPage();
    renderCompileTable();
    renderRanking();
    updateHeroMeta();
    setView("home");
  }

  function bindEvents() {
    dom.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const viewId = button.dataset.view;
        if (viewId === "station-view" && !state.setup.teams.length) {
          showStatus("Set up teams first on Home.", true);
          return;
        }

        if (viewId === "compile-view" && !getAllKnownTeams().length) {
          showStatus("No saved teams yet to compile.", true);
          return;
        }
        setView(viewId.replace("-view", ""));
      });
    });

    dom.setupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveSetup();
    });

    dom.teamsInput.addEventListener("input", renderTeamMeta);

    dom.clearAllBtn.addEventListener("click", () => {
      if (!window.confirm("Clear all setup and scores on this device?")) {
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      state = createDefaultState();
      currentStation = "fire";
      resetAllTimers();

      renderHome();
      renderStationTabs();
      renderStationPage();
      renderCompileTable();
      renderRanking();
      updateHeroMeta();
      showStatus("Device data cleared.");
    });

    dom.timerStart.addEventListener("click", () => startTimerState(singleTimer, updateSingleTimerLabels));
    dom.timerStop.addEventListener("click", () => {
      stopTimerState(singleTimer, updateSingleTimerLabels);
      if (isTripodStation()) {
        updateTripodSkillFromTimer();
        updateScorePreview();
      }
    });
    dom.timerReset.addEventListener("click", () => {
      resetTimerState(singleTimer);
      updateSingleTimerLabels();
      if (isFireStation()) {
        updateFireSkillFromTimers();
      }
      if (isTripodStation()) {
        updateTripodSkillFromTimer();
      }
      updateScorePreview();
    });
    dom.timerCapture.addEventListener("click", () => {
      captureTimerState(singleTimer);
      updateSingleTimerLabels();
      if (isFireStation()) {
        updateFireSkillFromTimers();
      }
      if (isTripodStation()) {
        updateTripodSkillFromTimer();
      }
      updateScorePreview();
    });

    dom.fireBuildStart.addEventListener("click", () => startTimerState(fireBuildTimer, updateFireTimerLabels));
    dom.fireBuildStop.addEventListener("click", () => stopTimerState(fireBuildTimer, updateFireTimerLabels));
    dom.fireBuildReset.addEventListener("click", () => {
      resetTimerState(fireBuildTimer);
      updateFireTimerLabels();
      updateFireSkillFromTimers();
      updateScorePreview();
    });
    dom.fireBuildCapture.addEventListener("click", () => {
      captureTimerState(fireBuildTimer);
      updateFireTimerLabels();
      updateFireSkillFromTimers();
      updateScorePreview();
    });

    dom.fireBurnStart.addEventListener("click", () => startTimerState(fireBurnTimer, updateFireTimerLabels));
    dom.fireBurnStop.addEventListener("click", () => stopTimerState(fireBurnTimer, updateFireTimerLabels));
    dom.fireBurnReset.addEventListener("click", () => {
      resetTimerState(fireBurnTimer);
      updateFireTimerLabels();
      updateFireSkillFromTimers();
      updateScorePreview();
    });
    dom.fireBurnCapture.addEventListener("click", () => {
      captureTimerState(fireBurnTimer);
      updateFireTimerLabels();
      updateFireSkillFromTimers();
      updateScorePreview();
    });

    dom.fireFullSkillSeconds.addEventListener("input", handleFireRuleInput);
    dom.fireZeroSkillSeconds.addEventListener("input", handleFireRuleInput);

    [dom.scoreSkill, dom.scoreTeamwork, dom.scoreSafety].forEach((input) => {
      input.addEventListener("input", updateScorePreview);
    });

    [dom.rangeTargetsHit, dom.rangeTargetsPossible].forEach((input) => {
      input.addEventListener("input", () => {
        updateRangeSkillFromTargets();
        updateScorePreview();
      });
    });

    dom.teamSelect.addEventListener("change", loadTeamScoreToForm);

    dom.scoreForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveTeamScore();
    });

    dom.copySummaryBtn.addEventListener("click", copyStationSummary);
    dom.fillLocalScores.addEventListener("click", fillCompileFromAllLocalScores);

    dom.compileBody.addEventListener("input", handleCompileInput);
  }

  function createDefaultState() {
    return {
      setup: {
        judgeName: "",
        teams: [],
        fireFullSkillSeconds: 240,
        fireZeroSkillSeconds: 600
      },
      scores: {
        fire: {},
        range: {},
        tripod: {}
      },
      compile: {}
    };
  }

  function loadState() {
    const fallback = createDefaultState();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return fallback;
      }

      return {
        setup: {
          judgeName: String(parsed.setup?.judgeName || ""),
          teams: normalizeTeams(parsed.setup?.teams || []),
          fireFullSkillSeconds: clampInt(parsed.setup?.fireFullSkillSeconds, 10, 3599),
          fireZeroSkillSeconds: clampInt(parsed.setup?.fireZeroSkillSeconds, 30, 7200)
        },
        scores: {
          fire: normalizeScoreMap(parsed.scores?.fire),
          range: normalizeScoreMap(parsed.scores?.range),
          tripod: normalizeScoreMap(parsed.scores?.tripod)
        },
        compile: normalizeCompileMap(parsed.compile)
      };
    } catch (error) {
      console.warn("Failed to load state", error);
      return fallback;
    }
  }

  function normalizeTeams(list) {
    const seen = new Set();
    const out = [];

    (Array.isArray(list) ? list : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .forEach((team) => {
        const key = team.toLowerCase();
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        out.push(team);
      });

    return out;
  }

  function normalizeScoreMap(map) {
    const safe = {};

    if (!map || typeof map !== "object") {
      return safe;
    }

    Object.entries(map).forEach(([team, value]) => {
      if (!team || !value || typeof value !== "object") {
        return;
      }

      safe[team] = {
        skill: clampInt(value.skill, 0, 6),
        teamwork: clampInt(value.teamwork, 0, 2),
        safety: clampInt(value.safety, 0, 2),
        total: clampInt(value.total, 0, 10),
        timeMs: Math.max(0, Number(value.timeMs) || 0),
        buildMs: Math.max(0, Number(value.buildMs) || 0),
        burnMs: Math.max(0, Number(value.burnMs) || 0),
        targetsHit: clampInt(value.targetsHit, 0, 999),
        targetsPossible: clampInt(value.targetsPossible, 1, 999),
        judge: String(value.judge || ""),
        updatedAt: safeIso(value.updatedAt)
      };
    });

    return safe;
  }

  function normalizeCompileMap(map) {
    const out = {};

    if (!map || typeof map !== "object") {
      return out;
    }

    Object.entries(map).forEach(([team, entry]) => {
      if (!team || !entry || typeof entry !== "object") {
        return;
      }

      out[team] = {
        fireScore: sanitizeNumericText(entry.fireScore),
        fireTime: sanitizeTimeText(entry.fireTime),
        rangeScore: sanitizeNumericText(entry.rangeScore),
        rangeTime: "N/A",
        tripodScore: sanitizeNumericText(entry.tripodScore),
        tripodTime: sanitizeTimeText(entry.tripodTime)
      };
    });

    return out;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getTimerMode(stationId) {
    return STATIONS[stationId]?.timerMode || "none";
  }

  function isFireStation() {
    return currentStation === "fire";
  }

  function isRangeStation() {
    return currentStation === "range";
  }

  function isTripodStation() {
    return currentStation === "tripod";
  }

  function renderHome() {
    dom.judgeName.value = state.setup.judgeName;
    dom.teamsInput.value = state.setup.teams.join("\n");
    renderTeamMeta();
  }

  function renderTeamMeta() {
    const teams = normalizeTeamsFromTextarea(dom.teamsInput.value);
    const key = computeTeamKey(teams);
    dom.teamCount.textContent = String(teams.length);
    dom.teamKey.textContent = key || "-";
  }

  function normalizeTeamsFromTextarea(text) {
    return normalizeTeams(String(text || "").split(/\r?\n/));
  }

  function computeTeamKey(teams) {
    if (!teams.length) {
      return "";
    }

    const seed = teams.map((team) => team.toLowerCase()).join("|");
    let hash = 0;

    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    return hash.toString(36).toUpperCase().padStart(6, "0").slice(-6);
  }

  function saveSetup() {
    const teams = normalizeTeamsFromTextarea(dom.teamsInput.value);
    if (teams.length < 2) {
      showStatus("Enter at least 2 teams.", true);
      return;
    }

    const rule = sanitizeFireSkillRuleInputs();

    state.setup.judgeName = String(dom.judgeName.value || "").trim();
    state.setup.teams = teams;
    state.setup.fireFullSkillSeconds = rule.full;
    state.setup.fireZeroSkillSeconds = rule.zero;

    syncCompileTeams();
    saveState();

    renderHome();
    renderStationTabs();
    renderStationPage();
    renderCompileTable();
    renderRanking();
    updateHeroMeta();

    showStatus("Setup saved. Team key: " + computeTeamKey(teams));
  }

  function updateHeroMeta() {
    dom.heroJudge.textContent = "Judge: " + (state.setup.judgeName || "-");
    dom.heroTeamKey.textContent = "Team Key: " + (computeTeamKey(state.setup.teams) || "-");
  }

  function setView(viewName) {
    Object.entries(dom.views).forEach(([name, element]) => {
      element.classList.toggle("hidden", name !== viewName);
    });

    dom.navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewName + "-view");
    });
  }

  function renderStationTabs() {
    dom.stationTabs.innerHTML = "";

    Object.entries(STATIONS).forEach(([id, meta]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tab-btn" + (id === currentStation ? " active" : "");
      button.textContent = meta.label;
      button.dataset.station = id;
      button.addEventListener("click", () => {
        stopAllRunningTimers();
        currentStation = id;
        renderStationTabs();
        renderStationPage();
      });
      dom.stationTabs.appendChild(button);
    });
  }

  function renderStationPage() {
    const meta = STATIONS[currentStation];
    dom.stationTitle.textContent = meta.label;
    dom.stationObjective.textContent = meta.objective;

    const timerMode = getTimerMode(currentStation);
    dom.fireTimersBox.classList.toggle("hidden", timerMode !== "dual-fire");
    dom.singleTimerBox.classList.toggle("hidden", timerMode !== "single");
    dom.timingNote.classList.toggle("hidden", timerMode !== "none");

    dom.rangeTargetsBox.classList.toggle("hidden", !meta.usesTargets);

    if (isFireStation()) {
      dom.detailHeader.textContent = "Build + Burn";
      dom.skillLabel.textContent = "Fire Time Skill (0-6, auto)";
      dom.scoreSkill.disabled = true;
    } else if (isRangeStation()) {
      dom.detailHeader.textContent = "Hits";
      dom.skillLabel.textContent = "Aim Skill (0-6, auto-calculated from hits)";
      dom.scoreSkill.disabled = true;
    } else if (isTripodStation()) {
      dom.detailHeader.textContent = "Build Time";
      dom.skillLabel.textContent = "Tripod Time Skill (0-6, auto; -1 per 2 min)";
      dom.scoreSkill.disabled = true;
    } else {
      dom.detailHeader.textContent = "Detail";
      dom.skillLabel.textContent = "Skill Outcome (0-6)";
      dom.scoreSkill.disabled = false;
    }

    dom.fireFullSkillSeconds.value = String(state.setup.fireFullSkillSeconds || 240);
    dom.fireZeroSkillSeconds.value = String(state.setup.fireZeroSkillSeconds || 600);

    renderTeamSelect();
    renderStationResults();
    updateFireTimerLabels();
    updateSingleTimerLabels();
    updateRangeSkillFromTargets();
    updateFireSkillFromTimers();
    updateTripodSkillFromTimer();
    updateScorePreview();
  }

  function renderTeamSelect() {
    const teams = state.setup.teams;
    const current = dom.teamSelect.value;

    dom.teamSelect.innerHTML = "";

    if (!teams.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No teams set up";
      dom.teamSelect.appendChild(option);
      dom.teamSelect.disabled = true;
      return;
    }

    dom.teamSelect.disabled = false;

    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      dom.teamSelect.appendChild(option);
    });

    if (teams.includes(current)) {
      dom.teamSelect.value = current;
    }

    loadTeamScoreToForm();
  }

  function loadTeamScoreToForm() {
    const team = dom.teamSelect.value;
    const existing = state.scores[currentStation]?.[team];

    resetAllTimers();

    if (!existing) {
      dom.scoreSkill.value = "4";
      dom.scoreTeamwork.value = "1";
      dom.scoreSafety.value = "1";
      dom.rangeTargetsHit.value = "0";
      dom.rangeTargetsPossible.value = "10";
      updateRangeSkillFromTargets();
      updateFireSkillFromTimers();
      updateTripodSkillFromTimer();
      updateScorePreview();
      return;
    }

    dom.scoreSkill.value = String(existing.skill);
    dom.scoreTeamwork.value = String(existing.teamwork);
    dom.scoreSafety.value = String(existing.safety);

    if (isFireStation()) {
      setTimerState(fireBuildTimer, existing.buildMs || 0);
      setTimerState(fireBurnTimer, existing.burnMs || 0);
      updateFireTimerLabels();
      updateFireSkillFromTimers();
    }

    if (isRangeStation()) {
      dom.rangeTargetsHit.value = String(existing.targetsHit || 0);
      dom.rangeTargetsPossible.value = String(existing.targetsPossible || 10);
      updateRangeSkillFromTargets();
    }

    if (isTripodStation()) {
      setTimerState(singleTimer, existing.timeMs || 0);
      updateSingleTimerLabels();
      updateTripodSkillFromTimer();
    }

    updateScorePreview();
  }

  function handleFireRuleInput() {
    const rule = sanitizeFireSkillRuleInputs();
    state.setup.fireFullSkillSeconds = rule.full;
    state.setup.fireZeroSkillSeconds = rule.zero;
    saveState();
    updateFireSkillFromTimers();
    updateScorePreview();
  }

  function sanitizeFireSkillRuleInputs() {
    let full = clampInt(dom.fireFullSkillSeconds.value, 10, 3599);
    let zero = clampInt(dom.fireZeroSkillSeconds.value, 30, 7200);

    if (zero <= full) {
      zero = full + 30;
    }

    dom.fireFullSkillSeconds.value = String(full);
    dom.fireZeroSkillSeconds.value = String(zero);

    return { full, zero };
  }

  function updateFireSkillFromTimers() {
    if (!isFireStation()) {
      return;
    }

    const buildMs = getTimerScoreMs(fireBuildTimer);
    const burnMs = getTimerScoreMs(fireBurnTimer);

    let skill = 0;
    if (buildMs > 0 && burnMs > 0) {
      const rule = sanitizeFireSkillRuleInputs();
      skill = calculateFireSkill(buildMs + burnMs, rule.full, rule.zero);
    }

    dom.scoreSkill.value = String(skill);
  }

  function calculateFireSkill(totalMs, fullSeconds, zeroSeconds) {
    const totalSeconds = totalMs / 1000;
    if (totalSeconds <= fullSeconds) {
      return 6;
    }
    if (totalSeconds >= zeroSeconds) {
      return 0;
    }

    const ratio = (zeroSeconds - totalSeconds) / (zeroSeconds - fullSeconds);
    return clampInt(Math.round(ratio * 6), 0, 6);
  }

  function updateRangeSkillFromTargets() {
    if (!isRangeStation()) {
      return;
    }

    let possible = clampInt(dom.rangeTargetsPossible.value, 1, 999);
    let hit = clampInt(dom.rangeTargetsHit.value, 0, possible);

    dom.rangeTargetsPossible.value = String(possible);
    dom.rangeTargetsHit.value = String(hit);

    const skill = possible > 0 ? Math.round((hit / possible) * 6) : 0;
    dom.scoreSkill.value = String(clampInt(skill, 0, 6));
  }

  function updateTripodSkillFromTimer() {
    if (!isTripodStation()) {
      return;
    }

    const timeMs = getTimerScoreMs(singleTimer);
    if (timeMs <= 0) {
      dom.scoreSkill.value = "0";
      return;
    }

    const steps = Math.floor(timeMs / 120000);
    const skill = Math.max(0, 6 - steps);
    dom.scoreSkill.value = String(skill);
  }

  function updateScorePreview() {
    dom.scoreSkillValue.textContent = String(dom.scoreSkill.value);
    dom.scoreTeamworkValue.textContent = String(dom.scoreTeamwork.value);
    dom.scoreSafetyValue.textContent = String(dom.scoreSafety.value);

    const total =
      clampInt(dom.scoreSkill.value, 0, 6) +
      clampInt(dom.scoreTeamwork.value, 0, 2) +
      clampInt(dom.scoreSafety.value, 0, 2);

    dom.scoreTotal.textContent = String(total) + " / 10";
  }

  function saveTeamScore() {
    const team = dom.teamSelect.value;
    if (!team) {
      showStatus("Select a team first.", true);
      return;
    }

    updateRangeSkillFromTargets();
    updateFireSkillFromTimers();
    updateTripodSkillFromTimer();

    const skill = clampInt(dom.scoreSkill.value, 0, 6);
    const teamwork = clampInt(dom.scoreTeamwork.value, 0, 2);
    const safety = clampInt(dom.scoreSafety.value, 0, 2);
    const total = skill + teamwork + safety;

    let timeMs = 0;
    let buildMs = 0;
    let burnMs = 0;
    let targetsHit = 0;
    let targetsPossible = 0;

    if (isFireStation()) {
      buildMs = getTimerScoreMs(fireBuildTimer);
      burnMs = getTimerScoreMs(fireBurnTimer);
      if (buildMs <= 0 || burnMs <= 0) {
        showStatus("Capture both Fire timers before saving this team.", true);
        return;
      }
      timeMs = buildMs + burnMs;
    }

    if (isRangeStation()) {
      targetsPossible = clampInt(dom.rangeTargetsPossible.value, 1, 999);
      targetsHit = clampInt(dom.rangeTargetsHit.value, 0, targetsPossible);
    }

    if (isTripodStation()) {
      timeMs = getTimerScoreMs(singleTimer);
      if (timeMs <= 0) {
        showStatus("Capture tripod time before saving this team.", true);
        return;
      }
    }

    state.scores[currentStation][team] = {
      skill,
      teamwork,
      safety,
      total,
      timeMs,
      buildMs,
      burnMs,
      targetsHit,
      targetsPossible,
      judge: state.setup.judgeName || "",
      updatedAt: new Date().toISOString()
    };

    saveState();
    renderStationResults();
    showStatus("Saved " + STATIONS[currentStation].label + " score for " + team + ".");
  }

  function renderStationResults() {
    const rows = state.setup.teams
      .map((team) => {
        const entry = state.scores[currentStation]?.[team];

        let detail = "-";
        let displayTime = "-";

        if (entry) {
          if (isFireStation()) {
            detail =
              (entry.buildMs ? formatDuration(entry.buildMs) : "-") +
              " + " +
              (entry.burnMs ? formatDuration(entry.burnMs) : "-");
            displayTime = entry.timeMs ? formatDuration(entry.timeMs) : "-";
          } else if (isRangeStation()) {
            detail = (entry.targetsHit || 0) + "/" + (entry.targetsPossible || 0);
            displayTime = "N/A";
          } else {
            detail = "-";
            displayTime = entry.timeMs ? formatDuration(entry.timeMs) : "-";
          }
        } else if (isRangeStation()) {
          displayTime = "N/A";
        }

        return {
          team,
          detail,
          skill: entry?.skill,
          teamwork: entry?.teamwork,
          safety: entry?.safety,
          total: entry?.total,
          timeMs: entry?.timeMs || 0,
          displayTime,
          judge: entry?.judge || ""
        };
      })
      .sort((a, b) => {
        const as = Number.isFinite(a.total) ? a.total : -1;
        const bs = Number.isFinite(b.total) ? b.total : -1;
        if (bs !== as) {
          return bs - as;
        }
        if ((isFireStation() || isTripodStation()) && a.timeMs && b.timeMs) {
          return a.timeMs - b.timeMs;
        }
        return a.team.localeCompare(b.team);
      });

    if (!rows.length) {
      dom.stationResultsBody.innerHTML = '<tr><td colspan="8">No teams configured.</td></tr>';
      return;
    }

    dom.stationResultsBody.innerHTML = rows
      .map((row) => {
        return (
          "<tr>" +
          "<td>" + escapeHtml(row.team) + "</td>" +
          "<td>" + escapeHtml(row.detail) + "</td>" +
          "<td>" + (Number.isFinite(row.skill) ? row.skill : "-") + "</td>" +
          "<td>" + (Number.isFinite(row.teamwork) ? row.teamwork : "-") + "</td>" +
          "<td>" + (Number.isFinite(row.safety) ? row.safety : "-") + "</td>" +
          "<td>" + (Number.isFinite(row.total) ? row.total : "-") + "</td>" +
          "<td>" + row.displayTime + "</td>" +
          "<td>" + escapeHtml(row.judge || "-") + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function copyStationSummary() {
    const lines = [];
    lines.push("Desert Ranger Trial - Judge Hub");
    lines.push("Station: " + STATIONS[currentStation].label);
    lines.push("Judge: " + (state.setup.judgeName || "-"));
    lines.push("---------------------------------");

    const teams = getAllKnownTeams();
    const rows = teams.map((team) => {
      const score = state.scores[currentStation]?.[team];
      const total = Number.isFinite(score?.total) ? score.total + "/10" : "-";

      let detail = "";
      if (isFireStation()) {
        const build = score?.buildMs ? formatDuration(score.buildMs) : "-";
        const burn = score?.burnMs ? formatDuration(score.burnMs) : "-";
        const combined = score?.timeMs ? formatDuration(score.timeMs) : "-";
        detail = "Build " + build + " | Burn " + burn + " | Total " + combined;
      } else if (isRangeStation()) {
        detail = "Hits " + (score?.targetsHit || 0) + "/" + (score?.targetsPossible || 0);
      } else {
        detail = "Time " + (score?.timeMs ? formatDuration(score.timeMs) : "-");
      }

      return { team, total, detail, rawTotal: score?.total || -1, timeMs: score?.timeMs || 0 };
    });

    rows
      .sort((a, b) => {
        if (b.rawTotal !== a.rawTotal) {
          return b.rawTotal - a.rawTotal;
        }
        if ((isFireStation() || isTripodStation()) && a.timeMs && b.timeMs) {
          return a.timeMs - b.timeMs;
        }
        return a.team.localeCompare(b.team);
      })
      .forEach((row) => {
        lines.push(row.team + " | " + row.total + " | " + row.detail);
      });

    const payload = lines.join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(payload)
        .then(() => showStatus("Station summary copied."))
        .catch(() => {
          window.prompt("Copy summary:", payload);
          showStatus("Clipboard blocked, opened manual copy prompt.", true);
        });
      return;
    }

    window.prompt("Copy summary:", payload);
    showStatus("Clipboard not available, opened manual copy prompt.", true);
  }

  function getAllKnownTeams() {
    const ordered = [];
    const seen = new Set();

    const addTeam = (team) => {
      const label = String(team || "").trim();
      if (!label) {
        return;
      }

      const key = label.toLowerCase();
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      ordered.push(label);
    };

    state.setup.teams.forEach(addTeam);
    Object.keys(state.scores.fire || {}).forEach(addTeam);
    Object.keys(state.scores.range || {}).forEach(addTeam);
    Object.keys(state.scores.tripod || {}).forEach(addTeam);
    Object.keys(state.compile || {}).forEach(addTeam);

    return ordered;
  }

  function syncCompileTeams() {
    const next = {};

    getAllKnownTeams().forEach((team) => {
      const existing = state.compile[team] || {};
      next[team] = {
        fireScore: sanitizeNumericText(existing.fireScore),
        fireTime: sanitizeTimeText(existing.fireTime),
        rangeScore: sanitizeNumericText(existing.rangeScore),
        rangeTime: "N/A",
        tripodScore: sanitizeNumericText(existing.tripodScore),
        tripodTime: sanitizeTimeText(existing.tripodTime)
      };

      if (!next[team].rangeTime) {
        next[team].rangeTime = "N/A";
      }
    });

    state.compile = next;
  }

  function renderCompileTable() {
    syncCompileTeams();

    const teams = getAllKnownTeams();
    if (!teams.length) {
      dom.compileBody.innerHTML = '<tr><td colspan="8">No teams configured.</td></tr>';
      return;
    }

    dom.compileBody.innerHTML = teams
      .map((team) => {
        const entry = state.compile[team];
        const total = parseScore(entry.fireScore) + parseScore(entry.rangeScore) + parseScore(entry.tripodScore);

        return (
          "<tr>" +
          "<td>" + escapeHtml(team) + "</td>" +
          makeCompileInput(team, "fireScore", entry.fireScore, "0-10") +
          makeCompileInput(team, "fireTime", entry.fireTime, "mm:ss.t") +
          makeCompileInput(team, "rangeScore", entry.rangeScore, "0-10") +
          makeCompileInput(team, "rangeTime", entry.rangeTime, "N/A", true) +
          makeCompileInput(team, "tripodScore", entry.tripodScore, "0-10") +
          makeCompileInput(team, "tripodTime", entry.tripodTime, "mm:ss.t") +
          "<td><strong>" + total + "</strong></td>" +
          "</tr>"
        );
      })
      .join("");

    saveState();
  }

  function makeCompileInput(team, field, value, placeholder, disabled) {
    return (
      '<td><input data-team="' +
      escapeHtmlAttr(team) +
      '" data-field="' +
      field +
      '" value="' +
      escapeHtmlAttr(value || "") +
      '" placeholder="' +
      placeholder +
      '" ' +
      (disabled ? "disabled" : "") +
      " /></td>"
    );
  }

  function handleCompileInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const team = target.dataset.team;
    const field = target.dataset.field;
    if (!team || !field || !state.compile[team]) {
      return;
    }

    if (field.toLowerCase().includes("score")) {
      target.value = sanitizeNumericText(target.value);
    }

    if (field.toLowerCase().includes("time") && field !== "rangeTime") {
      target.value = sanitizeTimeText(target.value);
    }

    state.compile[team][field] = target.value;
    saveState();
    renderRanking();

    const totalCell = target.closest("tr")?.querySelector("td:last-child strong");
    if (totalCell) {
      const entry = state.compile[team];
      totalCell.textContent = String(
        parseScore(entry.fireScore) + parseScore(entry.rangeScore) + parseScore(entry.tripodScore)
      );
    }
  }

  function fillCompileFromAllLocalScores() {
    syncCompileTeams();

    getAllKnownTeams().forEach((team) => {
      const fire = state.scores.fire[team];
      const range = state.scores.range[team];
      const tripod = state.scores.tripod[team];

      if (fire) {
        state.compile[team].fireScore = String(fire.total);
        state.compile[team].fireTime = fire.timeMs ? formatDuration(fire.timeMs) : "";
      }

      if (range) {
        state.compile[team].rangeScore = String(range.total);
        state.compile[team].rangeTime = "N/A";
      }

      if (tripod) {
        state.compile[team].tripodScore = String(tripod.total);
        state.compile[team].tripodTime = tripod.timeMs ? formatDuration(tripod.timeMs) : "";
      }
    });

    saveState();
    renderCompileTable();
    renderRanking();
    showStatus("Filled compile table using all saved scores on this device.");
  }

  function renderRanking() {
    const teams = getAllKnownTeams();
    const rows = teams.map((team) => {
      const entry = state.compile[team] || {};
      const totalScore = parseScore(entry.fireScore) + parseScore(entry.rangeScore) + parseScore(entry.tripodScore);

      const fireTime = parseTimeToMs(entry.fireTime);
      const tripodTime = parseTimeToMs(entry.tripodTime);
      const tieBreakTimeMs = fireTime !== null && tripodTime !== null ? fireTime + tripodTime : null;

      return { team, totalScore, tieBreakTimeMs };
    });

    rows.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      if (a.tieBreakTimeMs !== null && b.tieBreakTimeMs !== null) {
        return a.tieBreakTimeMs - b.tieBreakTimeMs;
      }

      if (a.tieBreakTimeMs === null && b.tieBreakTimeMs !== null) {
        return 1;
      }

      if (a.tieBreakTimeMs !== null && b.tieBreakTimeMs === null) {
        return -1;
      }

      return a.team.localeCompare(b.team);
    });

    if (!rows.length) {
      dom.rankingBody.innerHTML = '<tr><td colspan="4">No teams configured.</td></tr>';
      return;
    }

    dom.rankingBody.innerHTML = rows
      .map((row, idx) => {
        return (
          "<tr>" +
          "<td>" + (idx + 1) + "</td>" +
          "<td>" + escapeHtml(row.team) + "</td>" +
          "<td>" + row.totalScore + " / 30</td>" +
          "<td>" + (row.tieBreakTimeMs !== null ? formatDuration(row.tieBreakTimeMs) : "-") + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function createTimerState() {
    return { intervalId: null, elapsedMs: 0, startMs: 0, capturedMs: 0 };
  }

  function startTimerState(timer, onTick) {
    if (timer.intervalId !== null) {
      return;
    }

    timer.startMs = Date.now() - timer.elapsedMs;
    timer.intervalId = window.setInterval(() => {
      timer.elapsedMs = Date.now() - timer.startMs;
      onTick();
    }, 100);
  }

  function stopTimerState(timer, onTick) {
    if (timer.intervalId === null) {
      return;
    }

    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.elapsedMs = Date.now() - timer.startMs;
    onTick();
  }

  function captureTimerState(timer) {
    timer.capturedMs = timer.elapsedMs;
  }

  function resetTimerState(timer) {
    if (timer.intervalId !== null) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }

    timer.elapsedMs = 0;
    timer.startMs = 0;
    timer.capturedMs = 0;
  }

  function setTimerState(timer, ms) {
    resetTimerState(timer);
    timer.elapsedMs = Math.max(0, Number(ms) || 0);
    timer.capturedMs = timer.elapsedMs;
  }

  function getTimerScoreMs(timer) {
    return timer.capturedMs > 0 ? timer.capturedMs : timer.elapsedMs;
  }

  function stopAllRunningTimers() {
    stopTimerState(singleTimer, updateSingleTimerLabels);
    stopTimerState(fireBuildTimer, updateFireTimerLabels);
    stopTimerState(fireBurnTimer, updateFireTimerLabels);
  }

  function resetAllTimers() {
    resetTimerState(singleTimer);
    resetTimerState(fireBuildTimer);
    resetTimerState(fireBurnTimer);
    updateSingleTimerLabels();
    updateFireTimerLabels();
  }

  function updateSingleTimerLabels() {
    dom.timerDisplay.textContent = formatDuration(singleTimer.elapsedMs);
    dom.capturedTime.textContent = formatDuration(singleTimer.capturedMs);
  }

  function updateFireTimerLabels() {
    dom.fireBuildDisplay.textContent = formatDuration(fireBuildTimer.elapsedMs);
    dom.fireBuildCaptured.textContent = formatDuration(fireBuildTimer.capturedMs);
    dom.fireBurnDisplay.textContent = formatDuration(fireBurnTimer.elapsedMs);
    dom.fireBurnCaptured.textContent = formatDuration(fireBurnTimer.capturedMs);
  }

  function parseScore(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return clampInt(num, 0, 10);
  }

  function parseTimeToMs(value) {
    const text = String(value || "").trim();
    if (!text || text.toUpperCase() === "N/A") {
      return null;
    }

    const match = text.match(/^(\d{1,2}):(\d{2})(?:\.(\d))?$/);
    if (!match) {
      return null;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const tenths = Number(match[3] || "0");
    if (seconds > 59) {
      return null;
    }

    return minutes * 60000 + seconds * 1000 + tenths * 100;
  }

  function formatDuration(ms) {
    const safe = Math.max(0, Number(ms) || 0);
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const tenths = Math.floor((safe % 1000) / 100);
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + "." + tenths;
  }

  function sanitizeNumericText(value) {
    const text = String(value || "").replace(/[^0-9]/g, "");
    if (!text) {
      return "";
    }
    return String(clampInt(text, 0, 10));
  }

  function sanitizeTimeText(value) {
    return String(value || "").replace(/[^0-9:.]/g, "").slice(0, 7);
  }

  function safeIso(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  }

  function clampInt(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return min;
    }
    return Math.min(max, Math.max(min, Math.round(num)));
  }

  function showStatus(message, isError) {
    dom.status.textContent = message;
    dom.status.classList.remove("hidden");
    dom.status.classList.toggle("error", Boolean(isError));

    clearTimeout(showStatus._timer);
    showStatus._timer = setTimeout(() => {
      dom.status.classList.add("hidden");
    }, 2600);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeHtmlAttr(text) {
    return escapeHtml(text).replace(/`/g, "&#096;");
  }
})();
