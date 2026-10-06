import React from 'react';
import { BookOpen } from 'lucide-react';

interface GuideCardProps {
  title: string;
  children: React.ReactNode;
}

const GuideCard: React.FC<GuideCardProps> = ({ title, children }) => (
  <section
    style={{
      background: '#0d111a',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      padding: '22px',
    }}
  >
    <h3 style={{ color: '#00e0ba', fontSize: '16px', lineHeight: 1.4, margin: '0 0 10px' }}>
      {title}
    </h3>
    <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.75 }}>
      {children}
    </div>
  </section>
);

const BulletList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul style={{ paddingLeft: '22px', margin: '8px 0 0', display: 'grid', gap: '7px' }}>
    {children}
  </ul>
);

export const AboutKMeansStudioView: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1080px', paddingBottom: '20px' }}>
    <header
      style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(0, 224, 186, 0.08))',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BookOpen size={24} color="#a78bfa" />
        <h2 style={{ color: '#f8fafc', fontSize: '22px', lineHeight: 1.35, margin: 0 }}>
          About K-Means Studio
        </h2>
      </div>
      <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.75, margin: '10px 0 0' }}>
        A practical guide to the project, its charts and controls, and how to interpret changes.
        You can use this page as a tour while exploring the other sections.
      </p>
    </header>

    <GuideCard title="Start here: what K-Means does">
      <p style={{ margin: 0 }}>
        K-Means is an unsupervised learning method: it groups numeric observations without needing
        pre-existing answer labels. You choose <strong>K</strong>, the number of groups. The
        algorithm places K centroids, assigns every point to its nearest centroid using Euclidean
        distance, and moves each centroid to the mean of its assigned points. It repeats those
        assignment and update steps until the groups stop changing, centroid movement is small
        enough, or the iteration limit is reached.
      </p>
      <p style={{ margin: '10px 0 0' }}>
        A cluster number or color is only an identifier; for example, Cluster 0 is not inherently
        better or more important than Cluster 1. Results depend on the selected numeric features,
        their scales, K, and the starting centroids.
      </p>
    </GuideCard>

    <GuideCard title="A quick tour of the project">
      <BulletList>
        <li><strong>Overview:</strong> see the current run's key metrics, the 3D data scene, and small Elbow and Silhouette charts.</li>
        <li><strong>Dataset &amp; Cleaning:</strong> load a sample or CSV, handle missing values, inspect column statistics, and choose the three numeric features used for clustering.</li>
        <li><strong>3D Visualization &amp; Clustering Process:</strong> explore the points and centroids, then play or step through the algorithm.</li>
        <li><strong>Inspect:</strong> look at cluster sizes, centroid movement, and why an individual point was assigned to a cluster.</li>
        <li><strong>Quality:</strong> use the Elbow and Silhouette views alongside cluster comparisons. No single score proves that a grouping is useful.</li>
        <li><strong>Explain:</strong> test a new point with Prediction Explorer or view a PCA projection of the numeric dataset.</li>
        <li><strong>Experiment:</strong> tune K-Means settings and compare runs made with different settings or seeds.</li>
      </BulletList>
    </GuideCard>

    <GuideCard title="Dataset, missing values, and feature scales">
      <p style={{ margin: 0 }}>
        The sample buttons load Iris, Customer Segments, or Gaussian Blobs. You can also upload a
        CSV file. The column profiler reports each column's type, minimum, maximum, mean, standard
        deviation, and missing count. The X, Y, and Z selectors choose three numeric features; those
        same three features drive this app's K-Means run, not just the drawing.
      </p>
      <BulletList>
        <li><strong>Mean imputation:</strong> fills a missing numeric value with that column's average. It is simple, but outliers can pull the average.</li>
        <li><strong>Median imputation:</strong> uses the middle value and is less affected by extreme values.</li>
        <li><strong>Mode imputation:</strong> uses the most frequent value; useful for repeated categories or values.</li>
        <li><strong>Drop rows:</strong> removes rows with missing entries. This avoids filling in values but reduces the dataset and may discard useful examples.</li>
        <li><strong>Feature scale matters:</strong> K-Means uses raw numeric distances and does not standardize features for the clustering calculation. A feature with a much larger numeric range can dominate. Consider preparing appropriately scaled numeric columns before clustering when units differ substantially.</li>
      </BulletList>
      <p style={{ margin: '10px 0 0' }}>
        The 3D renderer scales coordinates to fit the scene; that visual scaling does not change
        the feature values used by the clustering algorithm.
      </p>
    </GuideCard>

    <GuideCard title="How to read the main metrics">
      <BulletList>
        <li><strong>Inertia / WCSS:</strong> the total squared distance from each point to its assigned centroid. Smaller is tighter for a fixed dataset and feature set, but it normally falls as K increases. Compare it at the same K; a low value alone does not mean K is appropriate.</li>
        <li><strong>Silhouette score:</strong> summarizes how close points are to their own cluster compared with the nearest alternative cluster. It ranges from -1 to +1: nearer +1 is generally better separated, around 0 suggests overlap, and below 0 can mean points fit another cluster better. Treat it as a clue, not a universal pass/fail threshold.</li>
        <li><strong>Iterations:</strong> how many assignment/update rounds were needed. More rounds do not automatically mean a better result.</li>
        <li><strong>Runtime:</strong> approximate time for the local browser run; it can vary with device load, dataset size, and selected K.</li>
        <li><strong>Centroid shift:</strong> how far a centroid moved in one update. Shifts approaching zero indicate stabilization.</li>
      </BulletList>
    </GuideCard>

    <GuideCard title="3D graphs, layers, and movement controls">
      <BulletList>
        <li><strong>Points and colors:</strong> each dot is a row in the chosen three-feature space. Its color marks its current cluster; a centroid marker represents that cluster's mean.</li>
        <li><strong>Rotate, pan, and zoom:</strong> drag to orbit, pan, or zoom the camera to inspect the scene from another angle. Camera presets provide isometric, top, front, and side views; reset returns to the default camera. Auto-Rotate spins the camera for a continuous overview.</li>
        <li><strong>Trajectories:</strong> show the paths centroids take from their initial positions to later iterations. Longer paths mean more movement during fitting, not necessarily a worse result.</li>
        <li><strong>Distance Rays:</strong> draw point-to-centroid distances. The nearest centroid determines a point's assignment; rays are especially useful in Point Assignment and Prediction Explorer.</li>
        <li><strong>Cluster Hulls:</strong> translucent outlines give a rough spatial envelope for a cluster. They are a visual aid, not a formal statistical boundary or proof that clusters are spherical.</li>
        <li><strong>Floor Grid:</strong> provides depth and position context. Turning it off changes the background reference, not the data.</li>
        <li><strong>Point Size:</strong> increasing it makes dots easier to see but can cause overlap in dense areas; decreasing it reveals crowded points but makes individual dots smaller.</li>
        <li><strong>Cluster filter:</strong> isolate one cluster to inspect it; reset/show all brings the other clusters back.</li>
      </BulletList>
      <p style={{ margin: '10px 0 0' }}>
        These display controls do not retrain K-Means. They only change what is visible or how the
        scene is viewed.
      </p>
    </GuideCard>

    <GuideCard title="Clustering Process: replaying the algorithm">
      <p style={{ margin: 0 }}>
        The iteration scrubber selects a saved snapshot. Previous, Next, Play/Pause, and Reset let
        you move through initialization, assignment, and centroid updates. Playback speed changes
        only the animation pace; it does not change the clustering result.
      </p>
      <p style={{ margin: '10px 0 0' }}>
        At each step, compare point colors with centroid positions and follow the trajectories.
        The side panel explains the active phase. When the result stabilizes, assignments no longer
        change or centroid shifts fall below the selected tolerance.
      </p>
    </GuideCard>

    <GuideCard title="Inspect: cluster size, movement, and point assignment">
      <BulletList>
        <li><strong>Cluster Analysis — size chart:</strong> bar height is the number of points assigned to each cluster. Very uneven sizes may be real structure or a sign to inspect K, features, and outliers; equal sizes are not required.</li>
        <li><strong>Cluster profile:</strong> select a cluster card to see its centroid coordinates, average distance to its centroid, maximum distance, and the farthest points. The average describes typical spread; the maximum and farthest rows can highlight unusual observations.</li>
        <li><strong>Centroid Movement — shift chart:</strong> each line shows one cluster's centroid displacement per iteration. A decline toward zero is typical as the run settles. A large remaining shift at the final iteration may mean the maximum iteration cap was reached.</li>
        <li><strong>Trajectory summary:</strong> total traveled distance accumulates a centroid's movement across all steps; final shift is only the last step. They answer different questions.</li>
        <li><strong>Point Assignment:</strong> click a point or enter its index. The distance table and rays show its distance to each current centroid. The shortest distance wins; the gap to the second-nearest centroid indicates how close the decision was, not a calibrated probability.</li>
      </BulletList>
    </GuideCard>

    <GuideCard title="Quality graphs: Elbow and Silhouette">
      <BulletList>
        <li><strong>Elbow curve (K vs. inertia):</strong> each point shows the WCSS from a run at that K. Inertia generally decreases as K increases, because more centroids can fit points more closely. Look for where the steep improvement starts to flatten: beyond that elbow, extra clusters may provide diminishing returns. The suggested K is an automatic curvature heuristic, so check the curve and whether the groups make sense for your use.</li>
        <li><strong>Marginal reduction table:</strong> shows how much inertia drops when K increases by one and the percentage change. Large early gains followed by smaller gains help reveal diminishing returns. Use the row's action to apply a K.</li>
        <li><strong>Silhouette by cluster:</strong> each bar shows that cluster's mean silhouette; the dashed line is the overall mean. A low or negative cluster score can indicate overlap or questionable assignments even when the overall average looks acceptable.</li>
        <li><strong>Overview mini charts:</strong> the small Elbow curve and Silhouette bars are shortcuts to the full analyses. Click them to open the corresponding detailed page.</li>
      </BulletList>
    </GuideCard>

    <GuideCard title="Compare clusters, predict a point, and explore PCA">
      <BulletList>
        <li><strong>Cluster Comparison:</strong> the feature-means table describes the typical values in each group. The centroid separation matrix gives pairwise centroid distances: larger values mean centroids are farther apart in the selected feature space, but do not by themselves account for cluster spread or size.</li>
        <li><strong>Prediction Explorer:</strong> adjust the three feature sliders to move a query marker. Its predicted cluster is the nearest current centroid. The distance margin to the runner-up shows how close the choice is; it is not a probability or a supervised prediction with known ground truth.</li>
        <li><strong>PCA 3D View:</strong> Principal Component Analysis compresses the numeric columns into three orthogonal directions (PC1, PC2, PC3) that capture as much variance as possible in order. Explained-variance bars report how much variation each direction retains, and the total reports the share represented in 3D. PCA can hide information when that total is low; it is a projection, not a guarantee that the original high-dimensional clusters are preserved.</li>
        <li>The PCA page fits K-Means in the projected three-dimensional coordinates. Its view can therefore differ from the main run, which uses the selected X/Y/Z features.</li>
      </BulletList>
    </GuideCard>

    <GuideCard title="Parameter Tuning: what happens when settings go up or down">
      <BulletList>
        <li><strong>Number of clusters (K): increase it</strong> to split groups into more, smaller clusters; inertia usually drops, while Silhouette may improve or worsen. Too large a K can fragment meaningful groups. <strong>Decrease K</strong> to merge groups; the model is simpler, but distinct populations may be combined. There is no universally correct K.</li>
        <li><strong>Maximum iterations: increase it</strong> to allow more assignment/update steps when a run has not stabilized yet; this can take longer. <strong>Decrease it</strong> to cap work sooner, but the run may stop before convergence. If convergence happens early, raising the cap may have no effect.</li>
        <li><strong>Tolerance: increase it</strong> for a looser stopping condition, so the run can stop with a larger remaining centroid shift and often use fewer iterations. <strong>Decrease it</strong> for a stricter shift threshold, which can require more iterations. A stricter tolerance does not guarantee a meaningfully better clustering.</li>
        <li><strong>Initialization:</strong> K-Means++ spreads starting centroids using distance-weighted choices and is the recommended default. Random sampling picks starting rows uniformly; it can be useful for demonstrating how initialization changes a local result.</li>
        <li><strong>Random seed:</strong> keep the seed to reproduce the same initialization and compare settings fairly. Change or randomize it to explore another start; the resulting grouping and metrics may change even with the same K.</li>
      </BulletList>
      <div
        style={{
          background: '#131824',
          border: '1px solid #334155',
          borderLeft: '4px solid #facc15',
          borderRadius: '8px',
          marginTop: '14px',
          padding: '14px 16px',
        }}
      >
        <strong style={{ color: '#facc15' }}>About “learning rate”:</strong>{' '}
        <span style={{ color: '#cbd5e1' }}>
          this project uses standard Lloyd-style K-Means, which recomputes each centroid as the
          exact mean of its assigned points. It does not use gradient descent, so there is no
          learning-rate control to increase or decrease. Playback speed is only animation speed;
          tolerance and maximum iterations control stopping instead.
        </span>
      </div>
      <p style={{ margin: '12px 0 0' }}>
        The diagnostics show convergence status, iteration count, final inertia, and average
        Silhouette score. If the run hits its iteration cap, consider allowing more iterations;
        then compare the quality metrics and cluster interpretation rather than optimizing one
        number in isolation.
      </p>
    </GuideCard>

    <GuideCard title="Run Comparison and responsible interpretation">
      <p style={{ margin: 0 }}>
        Each tuning run is added to session history with its K, initialization method, seed,
        final inertia, Silhouette score, iteration count, and runtime. Use Restore to rerun a
        configuration. For a fair comparison, keep the dataset and feature set fixed; compare
        inertia at the same K, and use Silhouette plus domain knowledge when comparing different K
        values. Restoring a configuration runs the model again; it does not change the dataset.
      </p>
      <p style={{ margin: '10px 0 0' }}>
        K-Means works best when distance is meaningful and clusters are roughly compact. It is
        sensitive to feature scale and outliers, and it can struggle with curved, nested, or
        strongly uneven-density groups. Treat charts as evidence to investigate, not as automatic
        proof that a discovered cluster is real or useful.
      </p>
    </GuideCard>
  </div>
);
