/**
 * K-Means user clustering via scikit-learn.
 *
 * Input (via input_json):
 *   {
 *     users: Array<{ user_id, total_events, avg_session_min, artifact_ratio,
 *                    code_ratio, avg_latency_ms, active_days }>,
 *     k: number
 *   }
 *
 * Output: JSON string with labels and cluster metadata.
 */
export const CLUSTERING_PYTHON = `
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

data = json.loads(input_json)
users = data['users']
k = data.get('k', 4)

# Feature matrix
feature_names = ['total_events', 'avg_session_min', 'artifact_ratio', 'code_ratio', 'avg_latency_ms', 'active_days']
X_raw = np.array([[u[f] for f in feature_names] for u in users], dtype=float)

# Handle NaN/Inf
X_raw = np.nan_to_num(X_raw, nan=0.0, posinf=0.0, neginf=0.0)

# Standardize
scaler = StandardScaler()
X = scaler.fit_transform(X_raw)

# Fit K-Means
km = KMeans(n_clusters=k, random_state=42, n_init=15, max_iter=300)
labels = km.fit_predict(X)
inertia = float(km.inertia_)

# Cluster summary statistics
cluster_stats = []
ARCHETYPE_NAMES = {
  0: 'The Coder',
  1: 'The Casual',
  2: 'The Power User',
  3: 'The Collaborator',
}
for c in range(k):
    mask = labels == c
    subset = X_raw[mask]
    cluster_stats.append({
        'cluster': int(c),
        'name': ARCHETYPE_NAMES.get(c, f'Cluster {c}'),
        'size': int(np.sum(mask)),
        'pct': float(np.mean(mask)),
        'centroid_raw': {f: float(v) for f, v in zip(feature_names, subset.mean(axis=0))},
    })

# PCA projection for 2D scatter (manual 2-component PCA)
mean = X.mean(axis=0)
Xc = X - mean
cov = np.cov(Xc.T)
eigenvalues, eigenvectors = np.linalg.eigh(cov)
idx = np.argsort(eigenvalues)[::-1]
pcs = eigenvectors[:, idx[:2]]
X_2d = Xc @ pcs

result = {
    'labels': labels.tolist(),
    'x': X_2d[:, 0].tolist(),
    'y': X_2d[:, 1].tolist(),
    'cluster_stats': cluster_stats,
    'inertia': inertia,
    'feature_names': feature_names,
    'explained_variance': (eigenvalues[idx[:2]] / eigenvalues.sum()).tolist(),
}

json.dumps(result)
`;
