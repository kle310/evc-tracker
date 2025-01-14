import express from 'express';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { StationModel } from './models/stationModel';
import { StationController } from './controllers/stationController';
import { createStationRouter } from './routes/stationRoutes';
import { generateHomeView } from './views/homeView';
import { generateAboutView } from './views/aboutView';
import { generateFavoritesView } from './views/favoritesView';
import { generateMapView } from './views/mapView';
import { generateDetailedView } from './views/detailedView';
import path from 'path';

config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'), 
});

const stationModel = new StationModel(pool);
const stationController = new StationController(stationModel, pool);
const stationRouter = createStationRouter(stationController);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

app.use('/station', stationRouter);

app.get('/', async (req, res) => {
  const stations = await stationModel.getAllStations();
  console.log('All stations:', stations);
  const groupedStations = {
    free: stations.filter(station => Number(station.price_per_kwh) === 0),
    paid: stations.filter(station => Number(station.price_per_kwh) > 0)
  };
  console.log('Grouped stations:', groupedStations);
  res.send(generateHomeView(groupedStations));
});

app.get('/about', (req, res) => {
  res.send(generateAboutView());
});

app.get('/favorites', (req, res) => {
  res.send(generateFavoritesView());
});

app.get('/map', (req, res) => {
  res.send(generateMapView());
});

app.get('/station/:id', async (req, res) => {
  try {
    const stationId = req.params.id;
    const station = await stationController.getStationById(stationId);
    const availability = await stationController.getStationAvailabilityHistory(stationId);
    
    if (!station) {
      res.status(404).send('Station not found');
      return;
    }

    res.send(generateDetailedView(station, availability));
  } catch (error) {
    console.error('Error fetching station details:', error);
    res.status(500).send('Error fetching station details');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
