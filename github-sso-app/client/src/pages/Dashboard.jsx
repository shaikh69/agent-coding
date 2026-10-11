import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RepoTree from '../components/RepoTree';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState(new Map());
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const navigate = useNavigate();

  const token = sessionStorage.getItem('github_token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user profile
        const userRes = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        setUser(userData);

        // Fetch user's repositories (sorted by last updated)
        const reposRes = await fetch(
          'https://api.github.com/user/repos?sort=updated&per_page=30',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const reposData = await reposRes.json();
        setRepos(reposData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('github_token');
    navigate('/');
  };

  /** Toggle a .md file in/out of the selection */
  const handleToggleFile = (fileKey, fileInfo) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      if (next.has(fileKey)) {
        next.delete(fileKey);
      } else {
        next.set(fileKey, fileInfo);
      }
      return next;
    });
  };

  /** Fetch contents of all selected files and call the agent */
  const handleCallAgent = async () => {
    if (selectedFiles.size === 0) return;

    setAgentLoading(true);
    setAgentResult(null);

    try {
      // Fetch the raw content of each selected .md file
      const fileContents = await Promise.all(
        Array.from(selectedFiles.values()).map(async (file) => {
          const res = await fetch(file.download_url);
          const text = await res.text();
          return {
            repo: file.repo,
            path: file.path,
            name: file.name,
            content: text,
          };
        })
      );

      // ──────────────────────────────────────────────
      // TODO: Replace this with your actual agent call
      // The `fileContents` array contains objects like:
      //   { repo: "my-repo", path: "docs/frd.md", name: "frd.md", content: "..." }
      //
      // Example:
      //   const response = await fetch(`${API_URL}/api/agent/`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ files: fileContents }),
      //   });
      //   const data = await response.json();
      // ──────────────────────────────────────────────

      console.log('Selected file contents for agent:', fileContents);

      setAgentResult({
        success: true,
        message: `Agent called with ${fileContents.length} file(s). Check the console for details.`,
        files: fileContents.map((f) => `${f.repo}/${f.path}`),
      });
    } catch (error) {
      console.error('Agent call failed:', error);
      setAgentResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setAgentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="callback-container">
        <div className="spinner"></div>
        <h2>Loading your repositories...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      {user && (
        <header className="dashboard-header">
          <div className="user-info">
            <img src={user.avatar_url} alt="avatar" className="avatar" />
            <div>
              <h2>{user.name || user.login}</h2>
              <p className="username">@{user.login}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </header>
      )}

      {/* Selected Files Bar + Call Agent */}
      {selectedFiles.size > 0 && (
        <div className="agent-bar">
          <div className="agent-bar-info">
            <span className="agent-bar-count">{selectedFiles.size}</span>
            <span>file{selectedFiles.size > 1 ? 's' : ''} selected</span>
            <div className="selected-chips">
              {Array.from(selectedFiles.values()).map((f) => (
                <span key={`${f.repo}/${f.path}`} className="chip">
                  {f.name}
                  <button
                    className="chip-remove"
                    onClick={() => handleToggleFile(`${f.owner}/${f.repo}/${f.path}`, f)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            className="agent-btn"
            onClick={handleCallAgent}
            disabled={agentLoading}
          >
            {agentLoading ? (
              <>
                <span className="btn-spinner"></span>
                Calling Agent...
              </>
            ) : (
              '🤖 Call Agent'
            )}
          </button>
        </div>
      )}

      {/* Agent Result */}
      {agentResult && (
        <div className={`agent-result ${agentResult.success ? 'success' : 'error'}`}>
          <p>{agentResult.message}</p>
          {agentResult.files && (
            <ul className="agent-file-list">
              {agentResult.files.map((f) => (
                <li key={f}>📝 {f}</li>
              ))}
            </ul>
          )}
          <button className="dismiss-btn" onClick={() => setAgentResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Repo List with File Trees */}
      <section className="repos-section">
        <h3>Your Repositories ({repos.length})</h3>
        <p className="repos-hint">
          Expand a repo to browse its files. Select <code>.md</code> transcript files (FRD / BRD), then click <strong>Call Agent</strong>.
        </p>
        <div className="repo-trees">
          {repos.map((repo) => (
            <div key={repo.id} className="repo-card">
              <div className="repo-card-header">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="repo-name"
                >
                  {repo.name}
                </a>
                {repo.private ? (
                  <span className="badge private">Private</span>
                ) : (
                  <span className="badge public">Public</span>
                )}
                {repo.language && (
                  <span className="meta-item">
                    <span
                      className="lang-dot"
                      style={{ backgroundColor: getLanguageColor(repo.language) }}
                    ></span>
                    {repo.language}
                  </span>
                )}
              </div>
              {repo.description && (
                <p className="repo-desc">{repo.description}</p>
              )}
              <RepoTree
                owner={user?.login}
                repoName={repo.name}
                token={token}
                selectedFiles={selectedFiles}
                onToggleFile={handleToggleFile}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Returns a color for common programming languages */
function getLanguageColor(language) {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Dart: '#00B4AB',
  };
  return colors[language] || '#8b949e';
}

export default Dashboard;
