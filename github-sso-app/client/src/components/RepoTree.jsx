import { useState } from 'react';

/**
 * Recursively renders a repo's file/folder tree.
 * Fetches folder contents on-demand when expanded.
 */
function RepoTree({ owner, repoName, token, selectedFiles, onToggleFile }) {
  const [tree, setTree] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchContents = async (path = '') => {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    // Sort: folders first, then files, both alphabetical
    return Array.isArray(data)
      ? data.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        })
      : [];
  };

  const handleToggleRepo = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!tree) {
      setLoading(true);
      const contents = await fetchContents();
      setTree(contents);
      setLoading(false);
    }
    setExpanded(true);
  };

  return (
    <div className="repo-tree">
      <button className="tree-toggle" onClick={handleToggleRepo}>
        <span className={`chevron ${expanded ? 'open' : ''}`}>▶</span>
        <span className="tree-repo-icon">📁</span>
        <span className="tree-repo-name">{repoName}</span>
        {loading && <span className="tree-loading">Loading...</span>}
      </button>

      {expanded && tree && (
        <ul className="tree-list">
          {tree.map((item) => (
            <TreeNode
              key={item.sha + item.path}
              item={item}
              owner={owner}
              repoName={repoName}
              token={token}
              depth={1}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
              fetchContents={fetchContents}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeNode({
  item,
  owner,
  repoName,
  token,
  depth,
  selectedFiles,
  onToggleFile,
  fetchContents,
}) {
  const [children, setChildren] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDir = item.type === 'dir';
  const isMd = !isDir && item.name.toLowerCase().endsWith('.md');
  const fileKey = `${owner}/${repoName}/${item.path}`;
  const isSelected = selectedFiles.has(fileKey);

  const handleToggle = async () => {
    if (!isDir) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!children) {
      setLoading(true);
      const contents = await fetchContents(item.path);
      setChildren(contents);
      setLoading(false);
    }
    setExpanded(true);
  };

  const handleSelect = () => {
    onToggleFile(fileKey, {
      owner,
      repo: repoName,
      path: item.path,
      name: item.name,
      sha: item.sha,
      download_url: item.download_url,
    });
  };

  return (
    <li className="tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className={`tree-item ${isMd ? 'md-file' : ''} ${isSelected ? 'selected' : ''}`}>
        {isDir ? (
          <button className="tree-toggle" onClick={handleToggle}>
            <span className={`chevron ${expanded ? 'open' : ''}`}>▶</span>
            <span className="tree-icon">📂</span>
            <span>{item.name}</span>
            {loading && <span className="tree-loading">Loading...</span>}
          </button>
        ) : (
          <div className="tree-file">
            {isMd && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleSelect}
                className="file-checkbox"
              />
            )}
            <span className="tree-icon">{isMd ? '📝' : '📄'}</span>
            <span className={`file-name ${isMd ? 'md-highlight' : ''}`}>
              {item.name}
            </span>
          </div>
        )}
      </div>

      {expanded && children && (
        <ul className="tree-list">
          {children.map((child) => (
            <TreeNode
              key={child.sha + child.path}
              item={child}
              owner={owner}
              repoName={repoName}
              token={token}
              depth={depth + 1}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
              fetchContents={fetchContents}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default RepoTree;
