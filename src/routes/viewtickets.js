const express = require('express');
const viewRouter = express.Router();
const {userAuth}=require('../middleware/auth');


const {viewSellerTickets,editDeleteTicket, viewBuyerTickets, filterTickets } = require('../controllers/viewticketController');

const verifyRole = (role) => {
    return (req, res, next) => {
      const userRole = req.user.role;
      if (userRole !== role) {
        return res.status(403).json({ error: `Access restricted to ${role}s only` });
      }
      next();
    };
  };

viewRouter.get('/filter', filterTickets);

viewRouter.get('/:id',userAuth, verifyRole('seller'), viewSellerTickets);

viewRouter.get('/:id',userAuth, verifyRole('buyer'), viewBuyerTickets);
  
viewRouter.get('/:id/:ticketid/edit',userAuth, verifyRole('seller'), editDeleteTicket);

module.exports = viewRouter;
