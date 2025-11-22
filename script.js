// Game constants
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const RANK_VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10 };

// Pyramid structures for each pack: [row1, row2, row3, row4, row5]
const PYRAMID_STRUCTURE = [
    [1],           // Row 1: 1 card
    [2],           // Row 2: 2 cards
    [3],           // Row 3: 3 cards
    [2],           // Row 4: 2 cards
    [1]            // Row 5: 1 card
];

const PYRAMID2_STRUCTURE = [
    [1],           // Row 1: 1 card
    [2],           // Row 2: 2 cards
    [1]            // Row 3: 1 card
];

class SolitaireEleven {
    constructor() {
        this.pyramids = [{}, {}, {}];  // Three pyramids
        this.deck = [];
        this.discardPileCards = [];
        this.selectedCards = [];
        this.pairsRemoved = 0;
        this.history = [];
        this.gameWon = false;
        this.gameOver = false;
        
        this.newGameBtn = document.getElementById('newGameBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.deckStack = document.getElementById('deckStack');
        this.discardPileEl = document.getElementById('discardPile');
        this.gameOverDisplay = document.getElementById('gameOverDisplay');
        
        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.deckStack.addEventListener('click', () => this.drawFromDeck());
    }

    startNewGame() {
        this.deck = this.createDeck();
        this.shuffle(this.deck);
        
        // Initialize pyramids with 9, 4, and 9 cards respectively
        this.pyramids[0] = this.initPyramid(PYRAMID_STRUCTURE, 0, 9);
        this.pyramids[1] = this.initPyramid(PYRAMID2_STRUCTURE, 9, 4);
        this.pyramids[2] = this.initPyramid(PYRAMID_STRUCTURE, 13, 9);
        
        // Remaining 30 cards go to the deck
        this.deck = this.deck.slice(22);
        this.discardPileCards = [];
        this.selectedCards = [];
        this.pairsRemoved = 0;
        this.history = [];
        this.gameWon = false;
        this.gameOver = false;
        
        // Draw the first card from the deck
        if (this.deck.length > 0) {
            const firstCard = this.deck.pop();
            this.discardPileCards.push(firstCard);
        }
        
        this.render();
    }

    createDeck() {
        const deck = [];
        // Create 52 random cards from A-10
        // Target: total sum divisible by 11
        // Strategy: create 51 random cards, then add the final card to make sum divisible by 11
        
        for (let i = 0; i < 51; i++) {
            const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
            const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
            deck.push({ rank: randomRank, suit: randomSuit, id: Math.random() });
        }
        
        // Calculate current sum
        let currentSum = 0;
        for (let card of deck) {
            currentSum += RANK_VALUES[card.rank];
        }
        
        // Calculate what value we need for the 52nd card to make sum divisible by 11
        const remainder = currentSum % 11;
        let neededValue = (11 - remainder) % 11;
        
        // Find a rank with that value
        let finalRank = 'A'; // default to Ace (value 1)
        for (let rank of RANKS) {
            if (RANK_VALUES[rank] === neededValue) {
                finalRank = rank;
                break;
            }
        }
        
        // Add the final card
        const finalSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        deck.push({ rank: finalRank, suit: finalSuit, id: Math.random() });
        
        return deck;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    initPyramid(structure, startIndex, count) {
        const pyramid = {};
        let cardIndex = startIndex;
        
        structure.forEach((rowCount, rowIdx) => {
            pyramid[rowIdx] = [];
            for (let i = 0; i < rowCount; i++) {
                pyramid[rowIdx].push({
                    card: this.deck[cardIndex],
                    removed: false,
                    position: { row: rowIdx, col: i }
                });
                cardIndex++;
            }
        });
        
        return pyramid;
    }

    isCardExposed(pyramid, rowIdx, colIdx) {
        const structure = pyramid === this.pyramids[1] ? PYRAMID2_STRUCTURE : PYRAMID_STRUCTURE;
        const bottomRowIdx = structure.length - 1;
        
        // Cards on the bottom row are always exposed
        if (rowIdx === bottomRowIdx) {
            return true;
        }
        
        // For cards not on bottom row, check if all cards covering it are removed
        // When the pyramid narrows (nextRowSize < currentRowSize):
        //   A card at [row][col] can be covered by [row+1][col-1] and/or [row+1][col]
        // When the pyramid widens or stays same (nextRowSize >= currentRowSize):
        //   A card at [row][col] can be covered by [row+1][col] and/or [row+1][col+1]
        
        const nextRow = rowIdx + 1;
        const nextRowSize = structure[nextRow][0];
        const currentRowSize = structure[rowIdx][0];
        
        const coveringCards = [];
        
        if (nextRowSize < currentRowSize) {
            // Pyramid is narrowing - card is covered by [row+1][col-1] and [row+1][col]
            if (colIdx - 1 >= 0) {
                const card = pyramid[nextRow] && pyramid[nextRow][colIdx - 1];
                if (card) coveringCards.push(card);
            }
            if (colIdx < nextRowSize) {
                const card = pyramid[nextRow] && pyramid[nextRow][colIdx];
                if (card) coveringCards.push(card);
            }
        } else {
            // Pyramid is same size or widening - card is covered by [row+1][col] and [row+1][col+1]
            if (colIdx < nextRowSize) {
                const card = pyramid[nextRow] && pyramid[nextRow][colIdx];
                if (card) coveringCards.push(card);
            }
            if (colIdx + 1 < nextRowSize) {
                const card = pyramid[nextRow] && pyramid[nextRow][colIdx + 1];
                if (card) coveringCards.push(card);
            }
        }
        
        // If no covering cards exist, the card is exposed
        if (coveringCards.length === 0) {
            return true;
        }
        
        // All covering cards must be removed for this card to be exposed
        return coveringCards.every(card => card.removed);
    }

    render() {
        this.renderPyramid(this.pyramids[0], 'pyramid1', PYRAMID_STRUCTURE);
        this.renderPyramid(this.pyramids[1], 'pyramid2', PYRAMID2_STRUCTURE);
        this.renderPyramid(this.pyramids[2], 'pyramid3', PYRAMID_STRUCTURE);
        this.renderGameOverDisplay();
        this.renderDeck();
    }

    renderGameOverDisplay() {
        if (this.gameOver) {
            this.gameOverDisplay.textContent = 'GAME OVER';
        } else {
            this.gameOverDisplay.textContent = '';
        }
    }

    renderPyramid(pyramid, elementId, structure) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        
        structure.forEach((rowCount, rowIdx) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'pyramid-row';
            
            for (let colIdx = 0; colIdx < rowCount; colIdx++) {
                const cardData = pyramid[rowIdx][colIdx];
                
                if (cardData && !cardData.removed) {
                    const isExposed = this.isCardExposed(pyramid, rowIdx, colIdx);
                    const cardEl = this.createCardElement(cardData.card, { pyramid, rowIdx, colIdx, isExposed });
                    rowDiv.appendChild(cardEl);
                } else if (cardData && cardData.removed) {
                    // Empty space for removed card
                    const emptyDiv = document.createElement('div');
                    emptyDiv.style.width = '80px';
                    emptyDiv.style.height = '120px';
                    rowDiv.appendChild(emptyDiv);
                }
            }
            
            container.appendChild(rowDiv);
        });
    }

    createCardElement(card, metadata) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        
        if (!metadata.isExposed) {
            cardEl.classList.add('disabled');
        }
        
        if (this.selectedCards.some(c => c.id === card.id)) {
            cardEl.classList.add('selected');
        }
        
        // Determine suit color
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardEl.style.color = isRed ? '#e74c3c' : '#000';
        
        // Create card content
        cardEl.innerHTML = `
            <div class="card-content">
                <div class="card-corner top-left">
                    <div class="rank">${card.rank}</div>
                    <div class="suit">${card.suit}</div>
                </div>
                <div class="card-center">
                    <div class="suit">${card.suit}</div>
                </div>
                <div class="card-corner bottom-right">
                    <div class="rank">${card.rank}</div>
                    <div class="suit">${card.suit}</div>
                </div>
            </div>
        `;
        
        if (metadata.isExposed) {
            cardEl.addEventListener('click', () => this.selectCard(card, metadata));
        }
        
        return cardEl;
    }

    selectCard(card, metadata) {
        if (this.gameWon) {
            return;
        }
        
        // Deselect if clicking same card
        if (this.selectedCards.some(c => c.id === card.id)) {
            this.selectedCards = this.selectedCards.filter(c => c.id !== card.id);
            this.render();
            return;
        }
        
        this.selectedCards.push(card);
        this.checkMatch(card, metadata);
    }

    checkMatch(selectedCard = null, metadata = null) {
        // Calculate sum of all selected cards
        const sum = this.selectedCards.reduce((total, card) => {
            return total + RANK_VALUES[card.rank];
        }, 0);
        
        // Check if sum equals 11
        if (sum === 11) {
            this.saveToHistory();
            
            // Check if ANY of the selected cards was from the discard pile
            const discardTopCard = this.discardPileCards.length > 0 ? this.discardPileCards[this.discardPileCards.length - 1] : null;
            const wasFromDiscard = this.selectedCards.some(card => discardTopCard && card.id === discardTopCard.id);
            
            // Remove all selected cards
            this.selectedCards.forEach(card => {
                this.removeCard(card);
            });
            
            this.pairsRemoved++;
            this.selectedCards = [];
            
            // If any card was from discard pile, draw a new one
            if (wasFromDiscard && this.discardPileCards.length === 0 && this.deck.length > 0) {
                const card = this.deck.pop();
                this.discardPileCards.push(card);
            }
            
            // Check win condition
            if (this.checkWinCondition()) {
                this.gameWon = true;
            } else if (this.checkGameOver()) {
                this.gameOver = true;
            }
            
            this.render();
        } else if (sum > 11) {
            // If sum exceeds 11, clear selection and render
            setTimeout(() => {
                this.selectedCards = [];
                this.render();
            }, 1500);
        } else {
            // If sum is less than 11, keep cards selected and render
            this.render();
        }
    }

    removeCard(card) {
        // Check in all pyramids
        [this.pyramids[0], this.pyramids[1], this.pyramids[2]].forEach(pyramid => {
            for (let row in pyramid) {
                pyramid[row].forEach(cardData => {
                    if (cardData.card.id === card.id) {
                        cardData.removed = true;
                    }
                });
            }
        });
        
        // Check in discard pile
        const discardIndex = this.discardPileCards.findIndex(c => c.id === card.id);
        if (discardIndex !== -1) {
            this.discardPileCards.splice(discardIndex, 1);
        }
    }

    checkWinCondition() {
        // All cards in pyramids must be removed
        const allPyramidsEmpty = [this.pyramids[0], this.pyramids[1], this.pyramids[2]].every(pyramid => {
            return Object.values(pyramid).flat().every(cardData => cardData.removed);
        });
        
        // Deck and discard pile must be empty
        const deckAndDiscardEmpty = this.deck.length === 0 && this.discardPileCards.length === 0;
        
        return allPyramidsEmpty && deckAndDiscardEmpty;
    }

    checkGameOver() {
        // Game over if deck is empty and no matches possible
        if (this.deck.length > 0) {
            return false;
        }
        
        // Check if any matches are possible with exposed cards and discard card
        const exposedCards = [];
        
        // Get all exposed pyramid cards
        [this.pyramids[0], this.pyramids[1], this.pyramids[2]].forEach(pyramid => {
            Object.keys(pyramid).forEach(rowIdx => {
                pyramid[rowIdx].forEach((cardData, colIdx) => {
                    if (!cardData.removed && this.isCardExposed(pyramid, parseInt(rowIdx), colIdx)) {
                        exposedCards.push(cardData.card);
                    }
                });
            });
        });
        
        // Add discard card
        if (this.discardPileCards.length > 0) {
            exposedCards.push(this.discardPileCards[this.discardPileCards.length - 1]);
        }
        
        // Check if any combination of 2 or more cards sums to 11
        for (let i = 0; i < exposedCards.length; i++) {
            // Check all combinations starting from card i
            for (let mask = 1; mask < (1 << exposedCards.length); mask++) {
                if (!(mask & (1 << i))) continue; // Must include card i
                
                let sum = 0;
                let cardCount = 0;
                for (let j = 0; j < exposedCards.length; j++) {
                    if (mask & (1 << j)) {
                        sum += RANK_VALUES[exposedCards[j].rank];
                        cardCount++;
                    }
                }
                
                // Check if sum is 11 and at least 2 cards
                if (sum === 11 && cardCount >= 2) {
                    return false;
                }
            }
        }
        
        return true;
    }

    drawFromDeck() {
        // Disable clicks when deck is empty
        if (this.deck.length === 0) {
            return;
        }
        
        // If there's already a card in the discard pile, try to place it in the pyramid first
        if (this.discardPileCards.length > 0) {
            const cardToPlace = this.discardPileCards[this.discardPileCards.length - 1];
            const emptyPosition = this.findNextEmptyPosition();
            
            if (emptyPosition) {
                // Place the card in the pyramid
                const { pyramidIdx, rowIdx, colIdx } = emptyPosition;
                this.pyramids[pyramidIdx][rowIdx][colIdx].card = cardToPlace;
                this.pyramids[pyramidIdx][rowIdx][colIdx].removed = false;
                this.discardPileCards.pop();
                
                // Draw the next card from the deck if available
                if (this.deck.length > 0) {
                    const card = this.deck.pop();
                    this.discardPileCards.push(card);
                }
                
                this.render();
                return;
            }
        }
        
        // Otherwise, draw a new card from the deck
        const card = this.deck.pop();
        this.discardPileCards.push(card);
        this.render();
    }

    findNextEmptyPosition() {
        // Correct order: Pack2-Row1, Pack1-Row1, Pack2-Row2, Pack3-Row1, Pack1-Row2, Pack2-Row3, Pack3-Row2, Pack1-Row3, Pack3-Row3, Pack1-Row4, Pack3-Row4, Pack1-Row5, Pack3-Row5
        const order = [
            { pyramidIdx: 1, rowIdx: 0 },  // Pack 2, Row 1
            { pyramidIdx: 0, rowIdx: 0 },  // Pack 1, Row 1
            { pyramidIdx: 1, rowIdx: 1 },  // Pack 2, Row 2
            { pyramidIdx: 2, rowIdx: 0 },  // Pack 3, Row 1
            { pyramidIdx: 0, rowIdx: 1 },  // Pack 1, Row 2
            { pyramidIdx: 1, rowIdx: 2 },  // Pack 2, Row 3
            { pyramidIdx: 2, rowIdx: 1 },  // Pack 3, Row 2
            { pyramidIdx: 0, rowIdx: 2 },  // Pack 1, Row 3
            { pyramidIdx: 2, rowIdx: 2 },  // Pack 3, Row 3
            { pyramidIdx: 0, rowIdx: 3 },  // Pack 1, Row 4
            { pyramidIdx: 2, rowIdx: 3 },  // Pack 3, Row 4
            { pyramidIdx: 0, rowIdx: 4 },  // Pack 1, Row 5
            { pyramidIdx: 2, rowIdx: 4 },  // Pack 3, Row 5
        ];
        
        for (let position of order) {
            const { pyramidIdx, rowIdx } = position;
            const pyramid = this.pyramids[pyramidIdx];
            const rowStructure = pyramidIdx === 1 ? PYRAMID2_STRUCTURE : PYRAMID_STRUCTURE;
            
            // Check if this row exists and iterate through its columns
            if (pyramid[rowIdx]) {
                for (let colIdx = 0; colIdx < rowStructure[rowIdx][0]; colIdx++) {
                    const cardData = pyramid[rowIdx][colIdx];
                    if (cardData && cardData.removed) {
                        return { pyramidIdx, rowIdx, colIdx };
                    }
                }
            }
        }
        
        return null; // No empty positions found
    }

    renderDeck() {
        const deckBackEl = this.deckStack.querySelector('.deck-back');
        
        if (this.deck.length === 0) {
            deckBackEl.classList.add('empty');
            this.deckStack.classList.add('disabled');
        } else {
            deckBackEl.classList.remove('empty');
            this.deckStack.classList.remove('disabled');
        }
        
        deckBackEl.textContent = this.deck.length > 0 ? `${this.deck.length}` : 'Empty';
        
        // Render discard pile
        this.discardPileEl.innerHTML = '';
        if (this.discardPileCards.length > 0) {
            const topCard = this.discardPileCards[this.discardPileCards.length - 1];
            const cardEl = this.createCardElement(topCard, { isExposed: true });
            this.discardPileEl.appendChild(cardEl);
        }
    }

    undo() {
        if (this.history.length === 0) {
            return;
        }
        
        const previousState = this.history.pop();
        this.pyramids = previousState.pyramids;
        this.deck = previousState.deck;
        this.discardPileCards = previousState.discardPileCards;
        this.pairsRemoved = previousState.pairsRemoved;
        this.gameWon = false;
        this.gameOver = false;
        this.selectedCards = [];
        this.render();
    }

    saveToHistory() {
        this.history.push({
            pyramids: JSON.parse(JSON.stringify(this.pyramids)),
            deck: [...this.deck],
            discardPileCards: [...this.discardPileCards],
            pairsRemoved: this.pairsRemoved
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SolitaireEleven();
});
