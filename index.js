const db = require('./db')
const express = require('express');
const { rateLimit } = require('express-rate-limit');

db.serialize();

const limiter = rateLimit({
    windowMs: 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests at the moment, try again later'
});

const app = express();
app.use(express.json());
app.use(limiter);

PORT = process.env.PORT || 8080;

// Submit a new thing to be voted on
app.post('/submit', (req, res) => {
    const { thing } = req.body;
    const key = thing.trim().toLowerCase();

    db.run(`
        INSERT OR IGNORE INTO fish_or_not (thing) VALUES (?)`, [key],
        (error) => {
            if (error) {
                return res.status(500).json({error: error.message});  
            } 
        }
    ); 

    res.json({message: `${thing} has entered the water, the voting begins!`});

});

// Submit a vote for a thing
app.post('/vote', (req, res) => {
    const { thing, is_fish } = req.body;
    const key = thing.trim().toLowerCase();

    db.get(`
        SELECT is_fish, is_not_fish FROM fish_or_not WHERE thing = (?)`, [key], 
        (error, row) => {
            if (error) {
                return res.status(500).json({error: error.message});
            }

            if (!row) {
                db.run(`
                    INSERT INTO fish_or_not (thing) VALUES (?)`, [key],
                (error) => {
                    if (error) {
                        res.status(500).json({error: error.message});
                    }

                    const is_fish = 0;
                    const is_not_fish = 0;
                });
            }

            const col = is_fish == true ? 'is_fish': 'is_not_fish';

            db.run(`
                UPDATE fish_or_not SET ${col} = ${col} + 1 WHERE thing = (?)`, [key],
            (error) => {
                if (error) {
                    res.status(500).json({error: error.message});
                }
            });

            res.status(200).json({message: `Fish verdict on ${thing} registered successfully`});
        }) 
});

// Return a random thing and its likeliness to be a fish
app.get('/random', (req, res) => {

    db.get(`
        SELECT thing, is_fish, is_not_fish FROM fish_or_not ORDER BY RANDOM() LIMIT 1`, 
    (error, row) => {
        if (error) {
            res.status(500).json({error: error.message});
        }

        if (!row) {
            res.status(404).json({error: 'There are no fish in the sea yet'})
        }

        const { thing, is_fish, is_not_fish } = row;

        if (is_fish > is_not_fish) verdict = "It's a fish!";
        else if (is_not_fish > is_fish) verdict  = "Its not a fish!";
        else verdict = "Too close to tell!?";
 
        const total = is_fish + is_not_fish;

        if (total == 0) fishiness = 'unknown';
        else fishiness = Math.round((is_fish / total) * 100);
        
        res.status(200).json({
            thing: thing,
            is_fish_votes: is_fish,
            is_not_fish_votes: is_not_fish,
            fishiness: fishiness,
            verdict: verdict
        });
    });
});

// Returns top 10 fishy things
app.get('/leaderboard', (req, res) => {

    db.all(`
        SELECT DISTINCT thing, is_fish, is_not_fish, (is_fish + is_not_fish) AS total_votes, ROUND(CAST(is_fish as REAL) / CASE WHEN (is_fish + is_not_fish) = 0 THEN 1 ELSE (is_fish + is_not_fish) END * 100) AS fishiness FROM fish_or_not ORDER BY fishiness DESC LIMIT 10`, 
        (error, rows) => {
            if (error) {
                res.status(500).json({error: error.message});
            }

            if (!rows) {
                res.status(404).json({error: 'There are no fish in the sea yet'});
            }

            res.status(200).json({leaderboard: rows});
        });
});

// Returns the consensus chance the thing is a fish
app.get('/status/:thing', (req, res) => {
    const thing = req.params.thing;
    const key = thing.trim().toLowerCase();

    db.get(`
        SELECT is_fish, is_not_fish FROM fish_or_not WHERE thing=?`, [key], (error, row) => {
            if (error) {
                res.status(500).json({error: error.message});
            }
            if (!row) {
                res.status(404).json({error: `${thing} not registered`});
            }

            const { is_fish, is_not_fish } = row;
            if (is_fish > is_not_fish) verdict = "It's a fish!";
            else if (is_not_fish > is_fish) verdict  = "Its not a fish!";
            else verdict = "Too close to tell!?";
 
            const total = is_fish + is_not_fish;

            if (total == 0) fishiness = 0;
            else fishiness = Math.round((is_fish / total) * 100);

            res.status(200).json({
                thing: thing,
                is_fish_votes: is_fish,
                is_not_fish_votes: is_not_fish,
                fishiness: fishiness,
                verdict: verdict
            });
        });
});

app.listen(
    PORT,
    () => console.log(`Let the fish voting begin, on port ${PORT}`)
);