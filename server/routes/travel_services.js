const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// MOCK Flight Search
router.get('/flights/search', authenticateToken, (req, res) => {
  const { origin, destination, date, class: travelClass } = req.query;
  
  // Mock results
  const flights = [
    { id: 'F1', airline: 'Emirates', price: 450, departure: '10:00 AM', duration: '3h 30m' },
    { id: 'F2', airline: 'Etihad', price: 420, departure: '02:00 PM', duration: '3h 45m' },
    { id: 'F3', airline: 'Air Arabia', price: 310, departure: '08:00 PM', duration: '3h 15m' }
  ];
  
  res.json({ results: flights, criteria: { origin, destination, date, travelClass } });
});

// MOCK Hotel Search
router.get('/hotels/search', authenticateToken, (req, res) => {
  const { location, checkIn, checkOut, guests } = req.query;
  
  const hotels = [
    { id: 'H1', name: 'Burj Al Arab', rating: 5, pricePerNight: 1200, availableRooms: 3 },
    { id: 'H2', name: 'Atlantis The Palm', rating: 5, pricePerNight: 850, availableRooms: 12 },
    { id: 'H3', name: 'Marriott Downtown', rating: 4, pricePerNight: 350, availableRooms: 25 }
  ];
  
  res.json({ results: hotels, criteria: { location, checkIn, checkOut, guests } });
});

module.exports = router;
