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
        
        this.messagedDiv = document.getElementById('message');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.hintBtn = document.getElementById('hintBtn');
        this.deckStack = document.getElementById('deckStack');
        this.discardPileEl = document.getElementById('discardPile');
        
        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.hintBtn.addEventListener('click', () => this.showHint());
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
        this.messagedDiv.textContent = '';
        
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
        this.renderDeck();
        this.updateInfo();
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
            this.showMessage('You won! Start a new game.', 'success');
            return;
        }
        
        // Deselect if clicking same card
        if (this.selectedCards.some(c => c.id === card.id)) {
            this.selectedCards = this.selectedCards.filter(c => c.id !== card.id);
            this.render();
            return;
        }
        
        this.selectedCards.push(card);
        this.checkMatch();
    }

    checkMatch() {
        // Calculate sum of all selected cards
        const sum = this.selectedCards.reduce((total, card) => {
            return total + RANK_VALUES[card.rank];
        }, 0);
        
        // Check if sum equals 11
        if (sum === 11) {
            this.saveToHistory();
            
            // Remove all selected cards
            this.selectedCards.forEach(card => {
                this.removeCard(card);
            });
            
            this.pairsRemoved++;
            this.selectedCards = [];
            this.showMessage('Match found! Cards removed!', 'success');
            
            // Check win condition
            if (this.checkWinCondition()) {
                this.gameWon = true;
                this.showMessage('🎉 You won! All cards removed!', 'success');
            }
            
            this.render();
        } else if (sum > 11) {
            // If sum exceeds 11, clear selection and show error
            this.showMessage(`Sum is ${sum}. Too high! Click cards to try again.`, 'error');
            setTimeout(() => {
                this.selectedCards = [];
                this.messagedDiv.textContent = '';
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

    drawFromDeck() {
        if (this.deck.length === 0) {
            if (this.discardPileCards.length === 0) {
                this.showMessage('No more cards!', 'error');
                return;
            }
            // Reshuffle discard pile back to deck
            this.deck = this.discardPileCards.reverse();
            this.discardPileCards = [];
        }
        
        const card = this.deck.pop();
        this.discardPileCards.push(card);
        this.render();
    }

    renderDeck() {
        const deckBackEl = this.deckStack.querySelector('.deck-back');
        
        if (this.deck.length === 0) {
            deckBackEl.classList.add('empty');
        } else {
            deckBackEl.classList.remove('empty');
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

    showHint() {
        if (this.gameWon) {
            return;
        }
        
        // Collect all exposed cards
        const exposedCards = this.getExposedCards();
        
        // Add discard pile top card
        if (this.discardPileCards.length > 0) {
            exposedCards.push(this.discardPileCards[this.discardPileCards.length - 1]);
        }
        
        // Find a match
        for (let i = 0; i < exposedCards.length; i++) {
            for (let j = i + 1; j < exposedCards.length; j++) {
                const val1 = RANK_VALUES[exposedCards[i].rank];
                const val2 = RANK_VALUES[exposedCards[j].rank];
                
                if (val1 + val2 === 11) {
                    this.showMessage('Hint: A match exists!', 'info');
                    return;
                }
            }
        }
        
        this.showMessage('No more matches available.', 'error');
    }

    getExposedCards() {
        const exposed = [];
        
        [this.pyramids[0], this.pyramids[1], this.pyramids[2]].forEach(pyramid => {
            Object.keys(pyramid).forEach(rowIdx => {
                pyramid[rowIdx].forEach((cardData, colIdx) => {
                    if (!cardData.removed && this.isCardExposed(pyramid, parseInt(rowIdx), colIdx)) {
                        exposed.push(cardData.card);
                    }
                });
            });
        });
        
        return exposed;
    }

    undo() {
        if (this.history.length === 0) {
            this.showMessage('Nothing to undo.', 'error');
            return;
        }
        
        const previousState = this.history.pop();
        this.pyramids = previousState.pyramids;
        this.deck = previousState.deck;
        this.discardPileCards = previousState.discardPileCards;
        this.pairsRemoved = previousState.pairsRemoved;
        this.gameWon = false;
        this.selectedCards = [];
        this.showMessage('Move undone!', 'info');
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

    updateInfo() {
        const remaining = this.getExposedCards().length + this.discardPileCards.length;
        document.getElementById('cardsRemaining').textContent = remaining;
        document.getElementById('pairsRemoved').textContent = this.pairsRemoved;
        document.getElementById('stockCount').textContent = this.deck.length + this.discardPileCards.length;
    }

    showMessage(text, className) {
        this.messagedDiv.textContent = text;
        this.messagedDiv.className = `message ${className}`;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SolitaireEleven();
});
