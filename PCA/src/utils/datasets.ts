import { DatasetInfo } from '../types/pca';

// 1. Classic Iris Dataset (150 samples, 4 features)
const IRIS_DATA_RAW = `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5.0,3.6,1.4,0.2,setosa
5.4,3.9,1.7,0.4,setosa
4.6,3.4,1.4,0.3,setosa
5.0,3.4,1.5,0.2,setosa
4.4,2.9,1.4,0.2,setosa
4.9,3.1,1.5,0.1,setosa
5.4,3.7,1.5,0.2,setosa
4.8,3.4,1.6,0.2,setosa
4.8,3.0,1.4,0.1,setosa
4.3,3.0,1.1,0.1,setosa
5.8,4.0,1.2,0.2,setosa
5.7,4.4,1.5,0.4,setosa
5.4,3.9,1.3,0.4,setosa
5.1,3.5,1.4,0.3,setosa
5.7,3.8,1.7,0.3,setosa
5.1,3.8,1.5,0.3,setosa
5.4,3.4,1.7,0.2,setosa
5.1,3.7,1.5,0.4,setosa
4.6,3.6,1.0,0.2,setosa
5.1,3.3,1.7,0.5,setosa
4.8,3.4,1.9,0.2,setosa
5.0,3.0,1.6,0.2,setosa
5.0,3.4,1.6,0.4,setosa
5.2,3.5,1.5,0.2,setosa
5.2,3.4,1.4,0.2,setosa
4.7,3.2,1.6,0.2,setosa
4.8,3.1,1.6,0.2,setosa
5.4,3.4,1.5,0.4,setosa
5.2,4.1,1.5,0.1,setosa
5.5,4.2,1.4,0.2,setosa
4.9,3.1,1.5,0.2,setosa
5.0,3.2,1.2,0.2,setosa
5.5,3.5,1.3,0.2,setosa
4.9,3.6,1.4,0.1,setosa
4.4,3.0,1.3,0.2,setosa
5.1,3.4,1.5,0.2,setosa
5.0,3.5,1.3,0.3,setosa
4.5,2.3,1.3,0.3,setosa
4.4,3.2,1.3,0.2,setosa
5.0,3.5,1.6,0.6,setosa
5.1,3.8,1.9,0.4,setosa
4.8,3.0,1.4,0.3,setosa
5.1,3.8,1.6,0.2,setosa
4.6,3.2,1.4,0.2,setosa
5.3,3.7,1.5,0.2,setosa
5.0,3.3,1.4,0.2,setosa
7.0,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4.0,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
5.7,2.8,4.5,1.3,versicolor
6.3,3.3,4.7,1.6,versicolor
4.9,2.4,3.3,1.0,versicolor
6.6,2.9,4.6,1.3,versicolor
5.2,2.7,3.9,1.4,versicolor
5.0,2.0,3.5,1.0,versicolor
5.9,3.0,4.2,1.5,versicolor
6.0,2.2,4.0,1.0,versicolor
6.1,2.9,4.7,1.4,versicolor
5.6,2.9,3.6,1.3,versicolor
6.7,3.1,4.4,1.4,versicolor
5.6,3.0,4.5,1.5,versicolor
5.8,2.7,4.1,1.0,versicolor
6.2,2.2,4.5,1.5,versicolor
5.6,2.5,3.9,1.1,versicolor
5.9,3.2,4.8,1.8,versicolor
6.1,2.8,4.0,1.3,versicolor
6.3,2.5,4.9,1.5,versicolor
6.1,2.8,4.7,1.2,versicolor
6.4,2.9,4.3,1.3,versicolor
6.6,3.0,4.4,1.4,versicolor
6.8,2.8,4.8,1.4,versicolor
6.7,3.0,5.0,1.7,versicolor
6.0,2.9,4.5,1.5,versicolor
5.7,2.6,3.5,1.0,versicolor
5.5,2.4,3.8,1.1,versicolor
5.5,2.4,3.7,1.0,versicolor
5.8,2.7,3.9,1.2,versicolor
6.0,2.7,5.1,1.6,versicolor
5.4,3.0,4.5,1.5,versicolor
6.0,3.4,4.5,1.6,versicolor
6.7,3.1,4.7,1.5,versicolor
6.3,2.3,4.4,1.3,versicolor
5.6,3.0,4.1,1.3,versicolor
5.5,2.5,4.0,1.3,versicolor
5.5,2.6,4.4,1.2,versicolor
6.1,3.0,4.6,1.4,versicolor
5.8,2.6,4.0,1.2,versicolor
5.0,2.3,3.3,1.0,versicolor
5.6,2.7,4.2,1.3,versicolor
5.7,3.0,4.2,1.2,versicolor
5.7,2.9,4.2,1.3,versicolor
6.2,2.9,4.3,1.3,versicolor
5.1,2.5,3.0,1.1,versicolor
5.7,2.8,4.1,1.3,versicolor
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3.0,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3.0,5.8,2.2,virginica
7.6,3.0,6.6,2.1,virginica
4.9,2.5,4.5,1.7,virginica
7.3,2.9,6.3,1.8,virginica
6.7,2.5,5.8,1.8,virginica
7.2,3.6,6.1,2.5,virginica
6.5,3.2,5.1,2.0,virginica
6.4,2.7,5.3,1.9,virginica
6.8,3.0,5.5,2.1,virginica
5.7,2.5,5.0,2.0,virginica
5.8,2.8,5.1,2.4,virginica
6.4,3.2,5.3,2.3,virginica
6.5,3.0,5.5,1.8,virginica
7.7,3.8,6.7,2.2,virginica
7.7,2.6,6.9,2.3,virginica
6.0,2.2,5.0,1.5,virginica
6.9,3.2,5.7,2.3,virginica
5.6,2.8,4.9,2.0,virginica
7.7,2.8,6.7,2.0,virginica
6.3,2.7,4.9,1.8,virginica
6.7,3.3,5.7,2.1,virginica
7.2,3.2,6.0,1.8,virginica
6.2,2.8,4.8,1.8,virginica
6.1,3.0,4.9,1.8,virginica
6.4,2.8,5.6,2.1,virginica
7.2,3.0,5.8,1.6,virginica
7.4,2.8,6.1,1.9,virginica
7.9,3.8,6.4,2.0,virginica
6.4,2.8,5.6,2.2,virginica
6.3,2.8,5.1,1.5,virginica
6.1,2.6,5.6,1.4,virginica
7.7,3.0,6.1,2.3,virginica
6.3,3.4,5.6,2.4,virginica
6.4,3.1,5.5,1.8,virginica
6.0,3.0,4.8,1.8,virginica
6.9,3.1,5.4,2.1,virginica
6.7,3.1,5.6,2.4,virginica
6.9,3.1,5.1,2.3,virginica
5.8,2.7,5.1,1.9,virginica
6.8,3.2,5.9,2.3,virginica
6.7,3.3,5.7,2.5,virginica
6.7,3.0,5.2,2.3,virginica
6.3,2.5,5.0,1.9,virginica
6.5,3.0,5.2,2.0,virginica
6.2,3.4,5.4,2.3,virginica
5.9,3.0,5.1,1.8,virginica`;

// Parse CSV text to raw rows
export function parseCsvText(csvText: string): { rows: any[]; headers: string[] } {
  const lines = csvText.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], headers: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const rowObj: any = {};
    for (let j = 0; j < headers.length; j++) {
      let val: any = parts[j] !== undefined ? parts[j].trim().replace(/^"|"$/g, '') : null;
      if (val === '' || val === 'null' || val === 'NaN' || val === '?') {
        val = null;
      } else if (!isNaN(Number(val)) && val !== '') {
        val = Number(val);
      }
      rowObj[headers[j]] = val;
    }
    rows.push(rowObj);
  }
  return { rows, headers };
}

// 2. Messy Customer Analytics Dataset (with deliberate missing values for testing Mean/Median/Mode)
const MESSY_CUSTOMER_DATA_RAW = `Customer_ID,Age,Annual_Income_k,Spending_Score,Purchases_Year,Web_Visits_Month,Segment
C101,19,15,39,4,1,Budget Shopper
C102,21,15,81,12,3,Trendsetter
C103,20,16,,6,2,Budget Shopper
C104,23,16,77,11,4,Trendsetter
C105,31,17,40,5,1,Budget Shopper
C106,22,,76,14,3,Trendsetter
C107,35,18,6,2,1,Low Engagement
C108,23,18,94,15,5,Trendsetter
C109,64,19,3,1,1,Low Engagement
C110,30,19,,13,4,Trendsetter
C111,67,19,14,2,2,Low Engagement
C112,,19,99,18,6,Trendsetter
C113,58,20,15,3,1,Low Engagement
C114,24,20,77,10,3,Trendsetter
C115,37,20,13,2,1,Low Engagement
C116,22,20,79,12,4,Trendsetter
C117,35,21,35,7,2,Budget Shopper
C118,20,21,,11,3,Trendsetter
C119,52,23,29,5,1,Budget Shopper
C120,35,23,98,16,5,Trendsetter
C121,46,25,5,1,1,Low Engagement
C122,25,24,73,12,4,Trendsetter
C123,,25,5,2,1,Low Engagement
C124,31,25,73,11,3,Trendsetter
C125,54,28,14,3,2,Low Engagement
C126,29,28,82,13,4,Trendsetter
C127,45,28,32,6,1,Budget Shopper
C128,35,28,61,9,3,High Value
C129,,29,31,5,2,Budget Shopper
C130,23,29,87,14,4,Trendsetter
C131,60,30,4,1,1,Low Engagement
C132,21,30,73,11,3,Trendsetter
C133,53,33,4,2,1,Low Engagement
C134,18,33,92,15,5,Trendsetter
C135,49,33,14,3,1,Low Engagement
C136,21,33,81,13,4,Trendsetter
C137,42,34,17,4,2,Budget Shopper
C138,30,34,73,10,3,Trendsetter
C139,36,37,26,5,1,Budget Shopper
C140,20,37,75,12,3,Trendsetter
C141,65,,35,6,2,Budget Shopper
C142,24,38,92,14,4,Trendsetter
C143,48,39,36,7,2,Budget Shopper
C144,31,39,61,9,3,High Value
C145,49,39,28,4,1,Budget Shopper
C146,24,39,65,10,3,High Value
C147,50,40,55,8,2,High Value
C148,27,40,47,7,2,High Value
C149,29,40,42,6,2,High Value
C150,31,40,42,6,2,High Value
C151,49,42,52,8,2,High Value
C152,33,42,60,9,3,High Value
C153,59,43,60,9,2,High Value
C154,45,44,54,8,2,High Value
C155,40,44,53,8,3,High Value
C156,23,45,,6,2,High Value
C157,43,46,41,6,2,High Value
C158,19,46,55,8,3,High Value
C159,38,47,59,9,3,High Value
C160,40,48,40,6,2,High Value
C161,34,48,1,1,1,Low Engagement
C162,19,48,59,9,3,High Value
C163,56,49,42,6,2,High Value
C164,54,49,59,9,2,High Value
C165,63,50,52,8,2,High Value
C166,18,50,59,9,3,High Value
C167,42,54,54,8,2,High Value
C168,,54,41,6,2,High Value
C169,36,54,44,7,2,High Value
C170,32,54,42,6,2,High Value
C171,70,63,55,8,2,High Value
C172,47,60,49,7,2,High Value
C173,60,60,49,7,2,High Value
C174,60,60,56,8,2,High Value
C175,59,60,45,7,2,High Value
C176,26,62,,9,3,High Value
C177,43,63,35,5,1,Budget Shopper
C178,19,63,54,8,2,High Value
C179,38,64,42,6,2,High Value
C180,46,65,48,7,2,High Value
C181,32,65,59,9,3,High Value
C182,38,67,40,6,2,High Value
C183,46,67,44,7,2,High Value
C184,52,69,50,7,2,High Value
C185,41,69,46,7,2,High Value
C186,54,70,43,6,2,High Value
C187,41,71,,7,2,High Value
C188,40,71,95,15,5,VIP Elite
C189,47,71,9,2,1,Low Engagement
C190,34,71,90,14,4,VIP Elite
C191,33,72,16,3,1,Low Engagement
C192,33,73,8,1,1,Low Engagement
C193,47,73,95,16,5,VIP Elite
C194,32,75,93,15,5,VIP Elite
C195,40,75,87,14,4,VIP Elite
C196,32,77,74,12,3,VIP Elite
C197,47,78,16,3,1,Low Engagement
C198,39,78,88,14,4,VIP Elite
C199,34,78,90,15,5,VIP Elite
C200,32,79,83,13,4,VIP Elite`;

// 3. Wine Recognition Dataset (178 samples, 13 features)
const WINE_DATA_RAW = `Alcohol,Malic_Acid,Ash,Alcalinity_Ash,Magnesium,Total_Phenols,Flavanoids,Nonflavanoid_Phenols,Proanthocyanins,Color_Intensity,Hue,OD280,Proline,Cultivar
14.23,1.71,2.43,15.6,127,2.8,3.06,0.28,2.29,5.64,1.04,3.92,1065,Class_1
13.2,1.78,2.14,11.2,100,2.65,2.76,0.26,1.28,4.38,1.05,3.4,1050,Class_1
13.16,2.36,2.67,18.6,101,2.8,3.24,0.3,2.81,5.68,1.03,3.17,1185,Class_1
14.37,1.95,2.5,16.8,113,3.85,3.49,0.24,2.18,7.8,0.86,3.45,1480,Class_1
13.24,2.59,2.87,21,118,2.8,2.69,0.39,1.82,4.32,1.04,2.93,735,Class_1
14.2,1.76,2.45,15.2,112,3.27,3.39,0.34,1.97,6.75,1.05,2.85,1450,Class_1
14.39,1.87,2.45,14.6,96,2.5,2.52,0.3,1.98,5.25,1.02,3.58,1290,Class_1
14.06,2.15,2.61,17.6,121,2.6,2.51,0.31,1.25,5.05,1.06,3.58,1295,Class_1
14.83,1.64,2.17,14,97,2.8,2.98,0.29,1.98,5.2,1.08,2.85,1045,Class_1
13.86,1.35,2.27,16,98,2.98,3.15,0.22,1.85,7.22,1.01,3.55,1045,Class_1
14.1,2.16,2.3,18,105,2.95,3.32,0.22,2.38,5.75,1.25,3.17,1510,Class_1
14.12,1.48,2.32,16.8,95,2.2,2.43,0.26,1.57,5,1.17,2.82,1280,Class_1
13.75,1.73,2.41,16,89,2.6,2.76,0.29,1.81,5.6,1.15,2.9,1320,Class_1
14.75,1.73,2.39,11.4,91,3.1,3.69,0.43,2.81,5.4,1.25,2.73,1150,Class_1
14.38,1.87,2.38,12,102,3.3,3.64,0.29,2.96,7.5,1.2,3,1547,Class_1
13.63,1.81,2.7,17.2,112,2.85,2.91,0.3,1.46,7.3,1.28,2.88,1310,Class_1
14.3,1.92,2.72,20,120,2.8,3.14,0.33,1.97,6.2,1.07,2.65,1280,Class_1
13.83,1.57,2.62,20,115,2.95,3.4,0.4,1.72,6.6,1.13,2.57,1130,Class_1
14.19,1.59,2.48,16.5,108,3.3,3.93,0.32,1.86,8.7,1.23,2.82,1680,Class_1
13.64,3.1,2.56,15.2,116,2.7,3.03,0.17,1.66,5.1,0.96,3.36,845,Class_1
14.06,1.63,2.28,16,126,3,3.17,0.24,2.1,5.65,1.09,3.71,780,Class_1
12.37,0.94,1.36,10.6,88,1.98,0.57,0.28,0.42,1.95,1.05,1.82,520,Class_2
12.33,1.1,2.28,16,101,2.05,1.09,0.63,0.41,3.27,1.25,1.67,680,Class_2
12.64,1.36,2.02,16.8,100,2.02,1.41,0.53,0.62,5.75,0.98,1.59,450,Class_2
13.67,1.25,1.92,18,94,2.1,1.79,0.32,0.73,3.8,1.23,2.46,630,Class_2
12.37,1.13,2.16,19,87,3.5,3.1,0.19,1.87,4.45,1.22,2.87,420,Class_2
12.17,1.45,2.53,19,104,1.89,1.75,0.45,1.03,2.95,1.45,2.23,355,Class_2
12.37,1.21,2.56,18.1,98,2.42,2.65,0.37,2.08,4.6,1.19,2.3,678,Class_2
13.11,1.01,1.7,15,78,2.98,3.18,0.26,2.28,5.3,1.12,3.18,502,Class_2
12.37,1.07,2.1,18.5,88,3.52,3.75,0.24,1.95,4.5,1.04,2.77,660,Class_2
12.29,1.61,2.21,20.4,103,1.1,1.02,0.37,1.46,3.05,0.906,1.82,870,Class_2
12.08,1.33,2.3,23.6,70,2.2,1.59,0.42,1.38,1.74,1.07,3.21,625,Class_2
12.08,1.83,2.32,18.5,81,1.6,1.5,0.52,1.64,2.4,1.08,2.27,480,Class_2
12.04,4.3,2.64,19,86,1.45,0.89,0.47,1.35,2.6,1.05,2.36,580,Class_2
12.86,1.35,2.32,18,122,1.51,1.25,0.21,0.94,4.1,0.76,1.29,630,Class_3
12.88,2.99,2.4,20,104,1.3,1.22,0.24,0.83,5.4,0.74,1.42,530,Class_3
12.81,2.31,2.4,24,98,1.15,1.09,0.27,0.83,5.7,0.66,1.36,560,Class_3
12.7,3.87,2.4,23,101,2.83,2.55,0.43,1.95,2.57,1.19,3.13,463,Class_3
12.51,1.24,2.25,17.5,85,2,0.58,0.6,1.25,5.45,0.75,1.51,650,Class_3
12.6,2.46,2.2,18.5,94,1.62,0.66,0.63,0.94,7.1,0.73,1.58,695,Class_3
12.25,4.72,2.54,21,89,1.38,0.47,0.53,0.8,4.38,0.67,1.33,480,Class_3
12.77,2.39,2.28,19.5,86,1.39,0.51,0.48,0.64,9.899999,0.57,1.63,470,Class_3
14.16,2.51,2.48,20,91,1.68,0.7,0.44,1.24,9.7,0.62,1.71,660,Class_3
13.71,5.65,2.45,20.5,95,1.68,0.61,0.52,1.06,7.7,0.64,1.74,740,Class_3
13.4,3.91,2.48,23,102,1.8,0.75,0.43,1.41,7.3,0.7,1.56,750,Class_3
13.27,4.28,2.26,20,120,1.59,0.69,0.43,1.35,10.2,0.59,1.56,835,Class_3
13.17,2.59,2.37,20,120,1.65,0.68,0.53,1.46,9.3,0.6,1.62,840,Class_3
14.13,4.1,2.74,24.5,96,2.05,0.76,0.56,1.35,9.2,0.61,1.6,560,Class_3`;

// 4. 3D Geometric Helical Swarm Dataset (Synthesized for stunning 3D visualization)
export function generate3DSwarmDataset(): DatasetInfo {
  const rows: any[] = [];
  const nPerCluster = 50;

  // Cluster 1: Neon Cyan Spiral
  for (let i = 0; i < nPerCluster; i++) {
    const t = (i / nPerCluster) * Math.PI * 4;
    const r = 2.0 + (i / nPerCluster) * 3.0;
    const noiseX = (Math.random() - 0.5) * 0.8;
    const noiseY = (Math.random() - 0.5) * 0.8;
    const noiseZ = (Math.random() - 0.5) * 0.8;
    rows.push({
      X_Coord: Number((r * Math.cos(t) + noiseX).toFixed(3)),
      Y_Coord: Number((r * Math.sin(t) + noiseY).toFixed(3)),
      Z_Coord: Number((t * 1.5 + noiseZ).toFixed(3)),
      Velocity: Number((2.5 + Math.sin(t) * 1.2).toFixed(3)),
      Density: Number((10 + Math.cos(t * 2) * 4).toFixed(3)),
      Cluster: 'Spiral Alpha'
    });
  }

  // Cluster 2: Magenta Counter-Spiral
  for (let i = 0; i < nPerCluster; i++) {
    const t = (i / nPerCluster) * Math.PI * 4;
    const r = 2.5 + (i / nPerCluster) * 2.5;
    const noiseX = (Math.random() - 0.5) * 0.8;
    const noiseY = (Math.random() - 0.5) * 0.8;
    const noiseZ = (Math.random() - 0.5) * 0.8;
    rows.push({
      X_Coord: Number((-r * Math.cos(t) + noiseX).toFixed(3)),
      Y_Coord: Number((-r * Math.sin(t) + noiseY).toFixed(3)),
      Z_Coord: Number(((Math.PI * 4 - t) * 1.5 + noiseZ).toFixed(3)),
      Velocity: Number((4.0 + Math.cos(t) * 1.5).toFixed(3)),
      Density: Number((14 + Math.sin(t * 2) * 5).toFixed(3)),
      Cluster: 'Spiral Beta'
    });
  }

  // Cluster 3: Lime Center Core
  for (let i = 0; i < nPerCluster; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(Math.random()) * 2.5;
    const sinPhi = Math.sin(phi);
    rows.push({
      X_Coord: Number((r * sinPhi * Math.cos(theta)).toFixed(3)),
      Y_Coord: Number((r * sinPhi * Math.sin(theta)).toFixed(3)),
      Z_Coord: Number((9.0 + r * Math.cos(phi)).toFixed(3)),
      Velocity: Number((1.2 + Math.random() * 0.8).toFixed(3)),
      Density: Number((25 + Math.random() * 10).toFixed(3)),
      Cluster: 'Core Swarm'
    });
  }

  const headers = ['X_Coord', 'Y_Coord', 'Z_Coord', 'Velocity', 'Density', 'Cluster'];
  return {
    id: '3d_swarm',
    name: '3D Helical Swarm (Geometric 3D)',
    category: 'Synthetic 3D',
    description: '3D twin spirals and central core designed for testing 3D spatial rotation and 3-axis PCA projection.',
    rows,
    headers,
    numericColumns: ['X_Coord', 'Y_Coord', 'Z_Coord', 'Velocity', 'Density'],
    categoricalColumns: ['Cluster'],
    defaultLabelCol: 'Cluster',
    defaultFeatures: ['X_Coord', 'Y_Coord', 'Z_Coord', 'Velocity', 'Density']
  };
}

// Built-in presets map
export function getPresetDatasets(): DatasetInfo[] {
  const irisParsed = parseCsvText(IRIS_DATA_RAW);
  const iris: DatasetInfo = {
    id: 'iris',
    name: 'Iris Flower Benchmark (Clean)',
    category: 'Benchmark',
    description: '150 samples with 4 morphological features across 3 flower species. The canonical standard for dimensionality reduction.',
    rawCsv: IRIS_DATA_RAW,
    rows: irisParsed.rows,
    headers: irisParsed.headers,
    numericColumns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'],
    categoricalColumns: ['species'],
    defaultLabelCol: 'species',
    defaultFeatures: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width']
  };

  const messyParsed = parseCsvText(MESSY_CUSTOMER_DATA_RAW);
  const messyCustomer: DatasetInfo = {
    id: 'messy_customer',
    name: 'Customer Analytics (Messy CSV with Missing Values)',
    category: 'Real World Messy',
    description: '100 customer records with missing cells across Age, Income, and Spending Score. Perfect for testing Mean, Median, and Mode imputation.',
    rawCsv: MESSY_CUSTOMER_DATA_RAW,
    rows: messyParsed.rows,
    headers: messyParsed.headers,
    numericColumns: ['Age', 'Annual_Income_k', 'Spending_Score', 'Purchases_Year', 'Web_Visits_Month'],
    categoricalColumns: ['Segment'],
    defaultLabelCol: 'Segment',
    defaultFeatures: ['Age', 'Annual_Income_k', 'Spending_Score', 'Purchases_Year', 'Web_Visits_Month'],
    isMessy: true
  };

  const wineParsed = parseCsvText(WINE_DATA_RAW);
  const wine: DatasetInfo = {
    id: 'wine',
    name: 'Wine Recognition (13 Features)',
    category: 'High-Dimensional',
    description: '48 wine samples with 13 continuous chemical constituents from 3 cultivars. Demonstrates multi-dimensional PCA compression.',
    rawCsv: WINE_DATA_RAW,
    rows: wineParsed.rows,
    headers: wineParsed.headers,
    numericColumns: [
      'Alcohol', 'Malic_Acid', 'Ash', 'Alcalinity_Ash', 'Magnesium',
      'Total_Phenols', 'Flavanoids', 'Nonflavanoid_Phenols', 'Proanthocyanins',
      'Color_Intensity', 'Hue', 'OD280', 'Proline'
    ],
    categoricalColumns: ['Cultivar'],
    defaultLabelCol: 'Cultivar',
    defaultFeatures: [
      'Alcohol', 'Malic_Acid', 'Ash', 'Alcalinity_Ash', 'Magnesium',
      'Total_Phenols', 'Flavanoids', 'Color_Intensity', 'Hue', 'OD280', 'Proline'
    ]
  };

  const swarm3D = generate3DSwarmDataset();

  return [iris, messyCustomer, wine, swarm3D];
}
