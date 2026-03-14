"""
Offline helper to train and inspect KMeans clustering quality.
Run: python ml_training/train_clustering.py
"""

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


def main() -> None:
    rng = np.random.default_rng(42)
    data = rng.normal(size=(1000, 6))
    scaler = StandardScaler()
    scaled = scaler.fit_transform(data)

    model = KMeans(n_clusters=6, random_state=42, n_init=10)
    labels = model.fit_predict(scaled)
    print(f"trained_kmeans_clusters={len(set(labels))}")


if __name__ == "__main__":
    main()
