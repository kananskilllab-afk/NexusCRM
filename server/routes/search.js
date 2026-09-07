const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/search?q=query
router.get('/', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ leads: [], opportunities: [], customers: [], total: 0 });
  }

  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const [leads, opps, customers] = await Promise.all([
      Lead.find({
        $or: [
          { lead_code: regex },
          { first_name: regex },
          { last_name: regex },
          { mobile: regex },
          { email: regex },
          { destination: regex }
        ]
      })
      .select('id lead_code first_name last_name mobile email destination status assigned_to')
      .limit(6)
      .lean(),

      Opportunity.find({
        $or: [
          { opp_code: regex },
          { name: regex },
          { customer_name: regex },
          { destination: regex },
          { mobile: regex }
        ]
      })
      .select('id opp_code name customer_name destination stage estimated_value')
      .limit(6)
      .lean(),

      Customer.find({
        $or: [
          { id: regex },
          { first_name: regex },
          { last_name: regex },
          { name: regex },
          { mobile: regex },
          { phone: regex },
          { email: regex },
          { city: regex }
        ]
      })
      .select('id first_name last_name name mobile phone email city')
      .limit(6)
      .lean()
    ]);

    const formattedLeads = leads.map(l => ({
      id: l.id,
      title: `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.lead_code || 'Lead',
      subtitle: `${l.lead_code || ''} • ${l.destination || 'No Dest'} • ${l.mobile || ''}`.trim(),
      tag: l.status || 'Lead',
      category: 'Lead',
      link: `/leads/${l.id}`
    }));

    const formattedOpps = opps.map(o => ({
      id: o.id,
      title: o.name || o.opp_code || 'Deal',
      subtitle: `${o.opp_code || ''} • ${o.customer_name || ''} • ${o.destination || ''}`.trim(),
      tag: o.stage || 'Opportunity',
      category: 'Opportunity',
      link: `/pipeline`
    }));

    const formattedCustomers = customers.map(c => {
      const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id;
      return {
        id: c.id,
        title: name,
        subtitle: `${c.id} • ${c.mobile || c.phone || ''} • ${c.city || ''}`.trim(),
        tag: 'Customer',
        category: 'Customer',
        link: `/customers`
      };
    });

    const total = formattedLeads.length + formattedOpps.length + formattedCustomers.length;

    res.json({
      leads: formattedLeads,
      opportunities: formattedOpps,
      customers: formattedCustomers,
      total
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

module.exports = router;
