
const settingsDoc = db.collection('settings').doc('config');
let allCandidates = [];
let currentChart = null;
let currentUser = null;
let currentSettings = { votingEnabled: true, resultVisible: false, countdownEnd: null };

window.addEventListener('DOMContentLoaded', () => {
  applyDarkModeFromStorage();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page.endsWith('index.html')) {
    initLoginPage();
  }
  if (page.endsWith('vote.html')) {
    initVotePage();
  }
  if (page.endsWith('dashboard.html')) {
    initDashboardPage();
  }
  if (page.endsWith('admin.html')) {
    initAdminPage();
  }
});

function applyDarkModeFromStorage() {
  const darkMode = localStorage.getItem('voteDarkMode') === 'true';
  document.body.classList.toggle('dark-mode', darkMode);
}

function toggleDarkMode() {
  const enabled = !document.body.classList.contains('dark-mode');
  document.body.classList.toggle('dark-mode', enabled);
  localStorage.setItem('voteDarkMode', enabled);
}

function initLoginPage() {
  console.log('Initializing login page...');
  const userTab = document.getElementById('userTab');
  const adminTab = document.getElementById('adminTab');
  const userLoginForm = document.getElementById('userLoginForm');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const loginBtn = document.getElementById('loginBtn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');

  console.log('Elements found:', { userTab, adminTab, userLoginForm, adminLoginForm, loginBtn, adminLoginBtn });

  if (getUserSession()) {
    console.log('User session found, redirecting to vote.html');
    window.location.href = 'vote.html';
    return;
  }
  if (isAdminSession()) {
    console.log('Admin session found, redirecting to admin.html');
    window.location.href = 'admin.html';
    return;
  }

  userTab.addEventListener('click', () => {
    console.log('User tab clicked');
    userTab.classList.add('active');
    adminTab.classList.remove('active');
    userLoginForm.classList.add('active');
    adminLoginForm.classList.remove('active');
  });

  adminTab.addEventListener('click', () => {
    console.log('Admin tab clicked');
    adminTab.classList.add('active');
    userTab.classList.remove('active');
    adminLoginForm.classList.add('active');
    userLoginForm.classList.remove('active');
  });

  loginBtn.addEventListener('click', () => {
    console.log('Login button clicked');
    loginUser();
  });
  adminLoginBtn.addEventListener('click', () => {
    console.log('Admin login button clicked');
    loginAdmin();
  });
}

function loginUser() {
  console.log('loginUser function called');
  const rollNumber = document.getElementById('rollNumber').value.trim();
  const aadhar = document.getElementById('aadhar').value.trim();
  const dob = document.getElementById('dob').value;
  const message = document.getElementById('loginMessage');

  console.log('Form values:', { rollNumber, aadhar, dob });

  if (!rollNumber || !aadhar || !dob) {
    message.textContent = 'Please complete all login fields.';
    return;
  }
  if (!/^\d{12}$/.test(aadhar)) {
    message.textContent = 'Aadhaar must be 12 digits.';
    return;
  }

  message.textContent = 'Checking credentials…';
  console.log('Attempting to query Firestore...');
  db.collection('users')
    .where('rollNumber', '==', rollNumber)
    .where('aadhar', '==', aadhar)
    .where('dob', '==', dob)
    .limit(1)
    .get()
    .then((snapshot) => {
      console.log('Firestore query result:', snapshot);
      if (snapshot.empty) {
        message.textContent = 'Invalid login details. Please try again.';
        return;
      }
      const doc = snapshot.docs[0];
      const data = doc.data();
      const user = {
        id: doc.id,
        rollNumber: data.rollNumber || '',
        name: data.name || '',
        hasVoted: data.hasVoted || false,
        votedCandidate: data.votedCandidate || '',
      };
      setUserSession(user);
      window.location.href = 'vote.html';
    })
    .catch((error) => {
      console.error('Login error:', error);
      message.textContent = 'Login failed. Check network or Firebase setup.';
    });
}

function loginAdmin() {
  console.log('loginAdmin function called');
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const message = document.getElementById('loginMessage');

  console.log('Admin form values:', { email, password });

  if (!email || !password) {
    message.textContent = 'Please enter admin credentials.';
    return;
  }

  message.textContent = 'Signing in admin…';
  console.log('Attempting Firebase auth...');
  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      console.log('Admin login successful');
      setAdminSession(email);
      window.location.href = 'admin.html';
    })
    .catch((error) => {
      console.error('Admin login error:', error);
      message.textContent = 'Admin login failed. Verify email/password.';
    });
}

function setUserSession(user) {
  localStorage.setItem('voteUser', JSON.stringify(user));
}

function getUserSession() {
  try {
    return JSON.parse(localStorage.getItem('voteUser'));
  } catch {
    return null;
  }
}

function clearUserSession() {
  localStorage.removeItem('voteUser');
}

function setAdminSession(email) {
  localStorage.setItem('voteAdmin', 'true');
  localStorage.setItem('voteAdminEmail', email);
}

function isAdminSession() {
  return localStorage.getItem('voteAdmin') === 'true';
}

function clearAdminSession() {
  localStorage.removeItem('voteAdmin');
  localStorage.removeItem('voteAdminEmail');
}

function setupLogoutButtons() {
  const logoutButtons = document.querySelectorAll('#logoutBtn');
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      clearUserSession();
      clearAdminSession();
      auth.signOut().catch(() => {});
      window.location.href = 'index.html';
    });
  });
}

function requireUserAuth() {
  const session = getUserSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

function requireAdminAuth() {
  if (!isAdminSession()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function initVotePage() {
  currentUser = requireUserAuth();
  if (!currentUser) return;
  setupLogoutButtons();
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
  document.getElementById('candidateSearch').addEventListener('input', filterCandidates);
  listenSettings();
  listenCandidates();
}

function listenSettings() {
  settingsDoc.onSnapshot((doc) => {
    if (!doc.exists) {
      settingsDoc.set({ votingEnabled: true, resultVisible: false, countdownEnd: null }, { merge: true });
      return;
    }
    currentSettings = doc.data();
    updateVotingStatus();
    if (window.location.pathname.includes('dashboard.html')) {
      updateDashboardVisibility();
    }
    if (window.location.pathname.includes('admin.html')) {
      updateAdminSettingsDisplay();
    }
  });
}

function listenCandidates() {
  db.collection('candidates').orderBy('votes', 'desc').onSnapshot((snapshot) => {
    allCandidates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (window.location.pathname.includes('vote.html')) {
      renderCandidateCards(allCandidates);
    }
    if (window.location.pathname.includes('dashboard.html')) {
      renderDashboardResults(allCandidates);
    }
    if (window.location.pathname.includes('admin.html')) {
      renderAdminCandidateList(allCandidates);
    }
  });
}

function updateVotingStatus() {
  const statusFlag = document.getElementById('votingStatusFlag');
  const statusMessage = document.getElementById('statusMessage');
  if (!statusFlag || !statusMessage) return;
  const enabled = currentSettings.votingEnabled;
  statusFlag.textContent = enabled ? 'Voting is enabled' : 'Voting is currently disabled';
  statusMessage.textContent = enabled
    ? currentUser.hasVoted
      ? `You already voted for ${currentUser.votedCandidate || 'a candidate'}.`
      : 'Choose a candidate and cast your vote.'
    : 'Voting is paused. Please check back later.';

  if (currentSettings.countdownEnd) {
    startCountdown(currentSettings.countdownEnd);
  }
}

function startCountdown(endTimestamp) {
  const countdownEl = document.getElementById('countdownTimer');
  if (!countdownEl) return;

  const update = () => {
    const now = new Date();
    const end = new Date(endTimestamp);
    const diff = Math.max(0, end - now);
    const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    countdownEl.textContent = `Voting ends in: ${hours}:${minutes}:${seconds}`;
    if (diff <= 0) {
      countdownEl.textContent = 'Voting has ended.';
      clearInterval(window.voteCountdownTimer);
    }
  };
  clearInterval(window.voteCountdownTimer);
  update();
  window.voteCountdownTimer = setInterval(update, 1000);
}

function renderCandidateCards(candidates) {
  const container = document.getElementById('voteList');
  if (!container) return;
  const filtered = filterCandidateArray(candidates);
  container.innerHTML = filtered
    .map((candidate) => {
      const disabled = currentUser.hasVoted || !currentSettings.votingEnabled;
      const buttonLabel = currentUser.hasVoted
        ? currentUser.votedCandidate === candidate.name
          ? 'Voted'
          : 'Already Voted'
        : 'Vote Now';
      return `
        <article class="candidate-card">
          <img src="${candidate.imageURL || 'https://via.placeholder.com/220x220?text=Candidate'}" alt="${candidate.name}" />
          <div>
            <h3>${candidate.name}</h3>
            <p>${candidate.party}</p>
            <p><strong>${candidate.votes || 0} votes</strong></p>
            <button class="btn btn-primary vote-btn" ${disabled ? 'disabled' : ''} onclick="confirmVote('${candidate.id}')">${buttonLabel}</button>
          </div>
        </article>`;
    })
    .join('');

  if (!filtered.length) {
    container.innerHTML = '<p>No candidates match your search. Try another keyword.</p>';
  }
}

function filterCandidateArray(candidates) {
  const query = document.getElementById('candidateSearch')?.value.trim().toLowerCase() || '';
  if (!query) return [...candidates];
  return candidates.filter((candidate) => {
    return (
      candidate.name.toLowerCase().includes(query) ||
      candidate.party.toLowerCase().includes(query)
    );
  });
}

function filterCandidates() {
  renderCandidateCards(allCandidates);
}

function confirmVote(candidateId) {
  if (!currentUser || currentUser.hasVoted) return;
  const selected = allCandidates.find((item) => item.id === candidateId);
  if (!selected) return;

  if (!window.confirm(`Confirm vote for ${selected.name}?`)) return;

  const candidateRef = db.collection('candidates').doc(candidateId);
  const userRef = db.collection('users').doc(currentUser.id);

  db.runTransaction(async (transaction) => {
    const candidateDoc = await transaction.get(candidateRef);
    const userDoc = await transaction.get(userRef);
    if (!candidateDoc.exists || !userDoc.exists) {
      throw new Error('Record not found.');
    }
    const userData = userDoc.data();
    if (userData.hasVoted) {
      throw new Error('This user has already voted.');
    }
    const newCount = (candidateDoc.data().votes || 0) + 1;
    transaction.update(candidateRef, { votes: newCount });
    transaction.update(userRef, { hasVoted: true, votedCandidate: selected.name });
  })
    .then(() => {
      currentUser.hasVoted = true;
      currentUser.votedCandidate = selected.name;
      setUserSession(currentUser);
      updateVotingStatus();
      renderCandidateCards(allCandidates);
      alert(`You voted for ${selected.name}. Thank you!`);
    })
    .catch((error) => {
      console.error(error);
      alert('Unable to cast vote. Try again later.');
    });
}

function initDashboardPage() {
  currentUser = requireUserAuth();
  if (!currentUser) return;
  setupLogoutButtons();
  listenSettings();
  listenCandidates();
  fetchTotalVoters();
}

function updateDashboardVisibility() {
  const resultsArea = document.getElementById('resultsArea');
  const resultsMessage = document.getElementById('resultsMessage');
  if (!resultsArea || !resultsMessage) return;
  if (!currentSettings.resultVisible) {
    resultsArea.style.display = 'none';
    resultsMessage.textContent = 'Results are currently hidden. Please check back later.';
  } else {
    resultsArea.style.display = 'block';
    resultsMessage.textContent = 'Election results are live and updating in real time.';
  }
}

function renderDashboardResults(candidates) {
  const totalVotes = candidates.reduce((sum, item) => sum + (item.votes || 0), 0);
  document.getElementById('totalVotes').textContent = totalVotes;
  const candidateResults = document.getElementById('candidateResults');
  if (!candidateResults) return;

  candidateResults.innerHTML = candidates
    .map((candidate) => {
      const percent = totalVotes ? Math.round(((candidate.votes || 0) / totalVotes) * 100) : 0;
      return `
        <article class="candidate-card">
          <img src="${candidate.imageURL || 'https://via.placeholder.com/220x220?text=Candidate'}" alt="${candidate.name}" />
          <div>
            <h3>${candidate.name}</h3>
            <p>${candidate.party}</p>
            <p>${candidate.votes || 0} votes • ${percent}%</p>
            <div class="progress-bar"><span style="width:${percent}%"></span></div>
          </div>
        </article>`;
    })
    .join('');

  updateResultChart(candidates, totalVotes);
}

function updateResultChart(candidates, totalVotes) {
  const ctx = document.getElementById('resultChart');
  if (!ctx) return;
  const labels = candidates.map((candidate) => candidate.name);
  const votes = candidates.map((candidate) => candidate.votes || 0);
  if (currentChart) {
    currentChart.data.labels = labels;
    currentChart.data.datasets[0].data = votes;
    currentChart.update();
    return;
  }
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Votes',
          data: votes,
          backgroundColor: candidates.map(
            () => 'rgba(91, 130, 255, 0.75)'
          ),
          borderRadius: 16,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    },
  });
}

function fetchTotalVoters() {
  db.collection('users')
    .get()
    .then((snapshot) => {
      document.getElementById('totalVoters').textContent = snapshot.size;
      const votedCount = snapshot.docs.filter((doc) => doc.data().hasVoted).length;
      document.getElementById('totalVotes').textContent = votedCount;
    })
    .catch((error) => console.error(error));
}

function initAdminPage() {
  if (!requireAdminAuth()) return;
  setupLogoutButtons();
  listenSettings();
  listenCandidates();
  fetchAdminStats();

  document.getElementById('addCandidateBtn').addEventListener('click', addCandidate);
  document.getElementById('toggleVotingBtn').addEventListener('click', toggleVoting);
  document.getElementById('toggleResultsBtn').addEventListener('click', toggleResults);
  document.getElementById('resetVotesBtn').addEventListener('click', resetAllVotes);
}

function renderAdminCandidateList(candidates) {
  const container = document.getElementById('adminCandidateList');
  if (!container) return;
  container.innerHTML = candidates
    .map((candidate) => {
      return `
        <article class="candidate-card">
          <img src="${candidate.imageURL || 'https://via.placeholder.com/220x220?text=Candidate'}" alt="${candidate.name}" />
          <div>
            <h3>${candidate.name}</h3>
            <p>${candidate.party}</p>
            <p><strong>${candidate.votes || 0} votes</strong></p>
            <div class="card-actions">
              <button class="btn btn-secondary" onclick="editCandidate('${candidate.id}')">Edit</button>
              <button class="btn btn-danger" onclick="deleteCandidate('${candidate.id}')">Delete</button>
            </div>
          </div>
        </article>`;
    })
    .join('');
}

function addCandidate() {
  const name = document.getElementById('candidateName').value.trim();
  const party = document.getElementById('candidateParty').value.trim();
  const imageElement = document.getElementById('candidateImage');
  const file = imageElement.files[0];

  if (!name || !party || !file) {
    alert('Please fill all candidate fields and choose an image.');
    return;
  }

  const uploadTask = storage.ref(`candidate_images/${Date.now()}_${file.name}`).put(file);
  uploadTask.on(
    'state_changed',
    null,
    (error) => {
      console.error('Storage upload failed:', error);
      alert('Photo upload failed. Check Firebase Storage bucket and permissions.');
    },
    () => {
      uploadTask.snapshot.ref.getDownloadURL().then((url) => {
        db.collection('candidates')
          .add({ name, party, imageURL: url, votes: 0 })
          .then(() => {
            document.getElementById('candidateName').value = '';
            document.getElementById('candidateParty').value = '';
            imageElement.value = '';
            alert('Candidate added successfully.');
          })
          .catch((error) => {
            console.error(error);
            alert('Unable to add candidate.');
          });
      });
    }
  );
}

function editCandidate(candidateId) {
  const candidate = allCandidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  const name = prompt('Update candidate name', candidate.name);
  const party = prompt('Update party name', candidate.party);
  if (!name || !party) return;

  db.collection('candidates')
    .doc(candidateId)
    .update({ name, party })
    .then(() => {
      alert('Candidate updated successfully.');
    })
    .catch((error) => {
      console.error(error);
      alert('Update failed.');
    });
}

function deleteCandidate(candidateId) {
  if (!window.confirm('Delete this candidate? This action cannot be undone.')) return;
  db.collection('candidates')
    .doc(candidateId)
    .delete()
    .then(() => {
      alert('Candidate removed.');
    })
    .catch((error) => {
      console.error(error);
      alert('Could not delete candidate.');
    });
}

function toggleVoting() {
  if (!currentSettings) return;
  settingsDoc
    .update({ votingEnabled: !currentSettings.votingEnabled })
    .catch((error) => console.error(error));
}

function toggleResults() {
  if (!currentSettings) return;
  settingsDoc
    .update({ resultVisible: !currentSettings.resultVisible })
    .catch((error) => console.error(error));
}

function resetAllVotes() {
  if (!window.confirm('Reset all votes and all user votes?')) return;

  db.collection('candidates')
    .get()
    .then((snapshot) => {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.update(doc.ref, { votes: 0 }));
      return batch.commit();
    })
    .then(() => db.collection('users').get())
    .then((snapshot) => {
      const batch = db.batch();
      snapshot.docs.forEach((doc) =>
        batch.update(doc.ref, { hasVoted: false, votedCandidate: '' })
      );
      return batch.commit();
    })
    .then(() => {
      alert('All votes have been reset.');
    })
    .catch((error) => {
      console.error(error);
      alert('Reset failed.');
    });
}

function updateAdminSettingsDisplay() {
  document.getElementById('adminVotingEnabled').textContent = currentSettings.votingEnabled ? 'Yes' : 'No';
  document.getElementById('adminResultsVisible').textContent = currentSettings.resultVisible ? 'Yes' : 'No';
  document.getElementById('toggleVotingBtn').textContent = currentSettings.votingEnabled ? 'Disable Voting' : 'Enable Voting';
  document.getElementById('toggleResultsBtn').textContent = currentSettings.resultVisible ? 'Hide Results' : 'Show Results';
}

function fetchAdminStats() {
  db.collection('users')
    .get()
    .then((snapshot) => {
      const allUsers = snapshot.docs.map((doc) => doc.data());
      const totalVotes = allUsers.filter((user) => user.hasVoted).length;
      document.getElementById('adminTotalVoters').textContent = snapshot.size;
      document.getElementById('adminTotalVotes').textContent = totalVotes;
    })
    .catch((error) => console.error(error));
}
