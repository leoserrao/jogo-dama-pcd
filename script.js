// Aguarda o carregamento completo do HTML para iniciar o jogo
document.addEventListener('DOMContentLoaded', () => {
    const speechQueue = [];
    let isSpeaking = false;
    let isNarrationActive = true; // Controla se a narração por voz está ativa

    function processSpeechQueue() {
        if (speechQueue.length === 0) {
            isSpeaking = false;
            if (isVoiceCommandActive) {
                recognition.start();
            }
            return;
        }

        isSpeaking = true;
        if (isVoiceCommandActive) {
            recognition.stop();
        }

        const { text, callback } = speechQueue.shift();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.2;

        utterance.onend = () => {
            if (callback) {
                callback();
            }
            processSpeechQueue();
        };

        speechSynthesis.speak(utterance);
    }

    function speak(text, callback) {
        if (!isNarrationActive) {
            if (callback) callback(); // Garante que callbacks sejam chamados mesmo com a narração desativada
            return;
        }
        speechQueue.push({ text, callback });
        if (!isSpeaking) {
            processSpeechQueue();
        }
    }

    const canvas = document.getElementById('checkers-board');
    const ctx = canvas.getContext('2d');
    const statusDisplay = document.getElementById('status');
    const scoreDisplay = document.getElementById('score');
    const voiceToggleBtn = document.getElementById('voice-toggle');
    const narrationToggleBtn = document.getElementById('narration-toggle');
    const readRulesBtn = document.getElementById('read-rules-btn');

    // --- LÓGICA DE COMANDO DE VOZ ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isVoiceCommandActive = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;

        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();
            handleVoiceCommand(command);
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            if (isVoiceCommandActive) {
                setTimeout(() => recognition.start(), 500);
            }
        };

        recognition.onend = () => {
            if (isVoiceCommandActive && !isSpeaking) {
                setTimeout(() => recognition.start(), 500);
            }
        };

    } else {
        voiceToggleBtn.disabled = true;
        voiceToggleBtn.textContent = 'Comando de Voz não suportado';
    }

    function toggleVoiceCommands() {
        isVoiceCommandActive = !isVoiceCommandActive;
        if (isVoiceCommandActive) {
            voiceToggleBtn.textContent = 'Desativar Comandos de Voz';
            voiceToggleBtn.style.backgroundColor = '#4CAF50';
            recognition.start();
            speak('Comandos de voz ativados');
        } else {
            voiceToggleBtn.textContent = 'Ativar Comandos de Voz';
            voiceToggleBtn.style.backgroundColor = '';
            recognition.stop();
            speak('Comandos de voz desativados');
        }
    }

    function toggleNarration() {
        isNarrationActive = !isNarrationActive;
        if (isNarrationActive) {
            narrationToggleBtn.textContent = 'Desativar Narração (N)';
            narrationToggleBtn.style.backgroundColor = '#4CAF50';
            speak('Narração ativada.');
        } else {
            narrationToggleBtn.textContent = 'Ativar Narração (N)';
            narrationToggleBtn.style.backgroundColor = '';
        }
    }

    function readRules() {
        const rulesContainer = document.getElementById('rules');
        speechSynthesis.cancel(); // Para a fala atual
        speechQueue.length = 0; // Limpa a fila de falas
        isSpeaking = false;

        const elementsToRead = rulesContainer.querySelectorAll('h2, p');
        let textToSpeak = '';
        elementsToRead.forEach(el => {
            textToSpeak += el.textContent + ' ';
        });

        speak(textToSpeak.trim());
    }

    function handleVoiceCommand(command) {
        console.log("Comando recebido:", command);

        if (command.includes('CANCELAR')) {
            if (selectedPiece) {
                selectedPiece = null;
                drawBoard();
                speak('Seleção cancelada.');
            } else {
                speak('Nenhuma peça selecionada para cancelar.');
            }
            return;
        }

        const squareStr = command.replace(/[^A-H1-8]/g, '');

        if (!squareStr || squareStr.length !== 2) {
            speak('Não entendi a casa. Por favor, use letras de A a H e números de 1 a 8.');
            return;
        }

        const square = parseSquare(squareStr);

        if (!square) {
            speak('Casa inválida.');
            return;
        }

        const { row, col } = square;

        if (!selectedPiece) {
            const isPotentialStart = mandatoryMoves.some(m => m.fromRow === row && m.fromCol === col);
            if (isPotentialStart) {
                selectedPiece = { row, col };
                drawBoard();
                speak(`Peça em ${squareStr} selecionada. Para onde deseja mover?`);
            } else {
                speak(`Não é possível selecionar a peça em ${squareStr}. Verifique se a peça é sua e se ela pode se mover.`);
            }
        } else {
            const move = mandatoryMoves.find(m => m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col && m.toRow === row && m.toCol === col);

            if (move) {
                movePiece(move, true);
            } else {
                const isPotentialStart = mandatoryMoves.some(m => m.fromRow === row && m.fromCol === col);
                if (isPotentialStart) {
                    selectedPiece = { row, col };
                    drawBoard();
                    speak(`Seleção alterada para a peça em ${squareStr}. Para onde deseja mover?`);
                } else {
                    speak(`Movimento para ${squareStr} inválido. Para cancelar a seleção, diga "cancelar".`);
                }
            }
        }
    }

    function parseSquare(squareStr) {
        if (squareStr.length !== 2) return null;

        const colChar = squareStr.charAt(0);
        const rowChar = squareStr.charAt(1);

        const col = colChar.charCodeAt(0) - 'A'.charCodeAt(0);
        const row = 8 - parseInt(rowChar, 10);

        if (col < 0 || col >= BOARD_SIZE || isNaN(row) || row < 0 || row >= BOARD_SIZE) {
            return null;
        }

        return { row, col };
    }

    // Adiciona ouvintes de evento
    voiceToggleBtn.addEventListener('click', toggleVoiceCommands);
    narrationToggleBtn.addEventListener('click', toggleNarration);
    readRulesBtn.addEventListener('click', readRules);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            toggleVoiceCommands();
        }
        if (e.key.toUpperCase() === 'N') {
            e.preventDefault();
            toggleNarration();
        }
        if (e.key.toUpperCase() === 'R') {
            e.preventDefault();
            readRules();
        }
    });

    // Elementos de áudio
    const moveSound = document.getElementById('move-sound');
    const captureSound = document.getElementById('capture-sound');

    const BOARD_SIZE = 8;
    const SQUARE_SIZE = canvas.width / BOARD_SIZE;

    const EMPTY = 0, BLACK_PIECE = 1, WHITE_PIECE = 2, BLACK_KING = 3, WHITE_KING = 4;
    let board = [];
    let currentPlayer = BLACK_PIECE;
    let selectedPiece = null;
    let mandatoryMoves = [];

    function initializeBoard() {
        board = [
            [0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [2, 0, 2, 0, 2, 0, 2, 0],
            [0, 2, 0, 2, 0, 2, 0, 2],
            [2, 0, 2, 0, 2, 0, 2, 0]
        ];
        currentPlayer = BLACK_PIECE;
        selectedPiece = null;
        drawBoard();
        updateStatus(false);
        calculateTurnMoves();
        if (isNarrationActive) {
            narrationToggleBtn.textContent = 'Desativar Narração (N)';
            narrationToggleBtn.style.backgroundColor = '#4CAF50';
        } else {
            narrationToggleBtn.textContent = 'Ativar Narração (N)';
            narrationToggleBtn.style.backgroundColor = '';
        }
    }

    function drawBoard() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const x = col * SQUARE_SIZE;
                const y = row * SQUARE_SIZE;
                ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

                const piece = board[row][col];
                if (piece !== EMPTY) {
                    drawPiece(x + SQUARE_SIZE / 2, y + SQUARE_SIZE / 2, piece);
                }
            }
        }

        if (selectedPiece) {
            const { row, col } = selectedPiece;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

            const possibleMoves = mandatoryMoves.filter(m => m.fromRow === row && m.fromCol === col);
            ctx.fillStyle = 'rgba(10, 132, 255, 0.5)';

            for (const move of possibleMoves) {
                const { toRow, toCol } = move;
                const x = toCol * SQUARE_SIZE + SQUARE_SIZE / 2;
                const y = toRow * SQUARE_SIZE + SQUARE_SIZE / 2;
                ctx.beginPath();
                ctx.arc(x, y, SQUARE_SIZE / 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    function drawPiece(x, y, pieceType) {
        ctx.beginPath();
        ctx.arc(x, y, SQUARE_SIZE / 2 - 8, 0, 2 * Math.PI);
        ctx.fillStyle = isBlack(pieceType) ? '#111' : '#fff';
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        if (pieceType === BLACK_KING || pieceType === WHITE_KING) {
            ctx.beginPath();
            ctx.arc(x, y, SQUARE_SIZE / 2 - 18, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffd700';
            ctx.fill();
            ctx.closePath();
        }
    }

    function getPossibleMovesForPiece(row, col) {
        const piece = board[row][col];
        if (piece === EMPTY) return { captures: [], simples: [] };

        const captures = [];
        const simples = [];
        const isKing = piece === BLACK_KING || piece === WHITE_KING;
        const forwardDir = isBlack(piece) ? 1 : -1;

        if (isKing) {
            const moveDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dRow, dCol] of moveDirections) {
                let nextRow = row + dRow;
                let nextCol = col + dCol;
                while (isOnBoard(nextRow, nextCol)) {
                    if (board[nextRow][nextCol] === EMPTY) {
                        simples.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: nextCol, isCapture: false });
                        nextRow += dRow;
                        nextCol += dCol;
                    } else {
                        break;
                    }
                }
            }
        } else {
            const moveDirections = [[forwardDir, 1], [forwardDir, -1]];
            for (const [dRow, dCol] of moveDirections) {
                const toRow = row + dRow;
                const toCol = col + dCol;
                if (isOnBoard(toRow, toCol) && board[toRow][toCol] === EMPTY) {
                    simples.push({ fromRow: row, fromCol: col, toRow, toCol, isCapture: false });
                }
            }
        }

        const captureDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dRow, dCol] of captureDirections) {
            const opponentRow = row + dRow;
            const opponentCol = col + dCol;
            const toRow = row + dRow * 2;
            const toCol = col + dCol * 2;

            if (isOnBoard(toRow, toCol) && board[toRow][toCol] === EMPTY) {
                const middlePiece = board[opponentRow][opponentCol];
                if (isOpponent(middlePiece, piece)) {
                    captures.push({ fromRow: row, fromCol: col, toRow, toCol, isCapture: true });
                }
            }
        }
        return { captures, simples };
    }

    function calculateTurnMoves() {
        let allCaptures = [];
        let allSimples = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board[r][c];
                const isCurrentPlayerPiece = (currentPlayer === BLACK_PIECE && isBlack(piece)) || (currentPlayer === WHITE_PIECE && isWhite(piece));

                if (isCurrentPlayerPiece) {
                    const moves = getPossibleMovesForPiece(r, c);
                    allCaptures.push(...moves.captures);
                    allSimples.push(...moves.simples);
                }
            }
        }

        mandatoryMoves = allCaptures.length > 0 ? allCaptures : allSimples;

        if (mandatoryMoves.length === 0) {
            const winner = currentPlayer === BLACK_PIECE ? 'Brancas' : 'Pretas';
            statusDisplay.textContent = `${winner} Venceram! (Oponente sem movimentos)`;
        }
    }

    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.floor(x / SQUARE_SIZE);
        const row = Math.floor(y / SQUARE_SIZE);

        const isPotentialStart = mandatoryMoves.some(m => m.fromRow === row && m.fromCol === col);

        if (selectedPiece) {
            const move = mandatoryMoves.find(m => m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col && m.toRow === row && m.toCol === col);

            if (move) {
                movePiece(move, true);
            } else if (isPotentialStart && (selectedPiece.row !== row || selectedPiece.col !== col)) {
                selectedPiece = { row, col };
                const squareName = getSquareName(row, col);
                speak(`Casa ${squareName} selecionada. Para onde deseja mover?`);
                drawBoard();
            } else {
                selectedPiece = null;
                drawBoard();
            }
        } else if (isPotentialStart) {
            selectedPiece = { row, col };
            const squareName = getSquareName(row, col);
            speak(`Casa ${squareName} selecionada. Para onde deseja mover?`);
            drawBoard();
        }
    }

    function movePiece(move, narrate = false) {
        const { fromRow, fromCol, toRow, toCol, isCapture } = move;
        let piece = board[fromRow][fromCol];

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = EMPTY;

        if (isCapture) {
            const capturedRow = fromRow + (toRow - fromRow) / 2;
            const capturedCol = fromCol + (toCol - fromCol) / 2;
            board[capturedRow][capturedCol] = EMPTY;
            playSound(captureSound);
        } else {
            playSound(moveSound);
        }

        if (piece === BLACK_PIECE && toRow === BOARD_SIZE - 1) {
            board[toRow][toCol] = BLACK_KING;
        } else if (piece === WHITE_PIECE && toRow === 0) {
            board[toRow][toCol] = WHITE_KING;
        }

        if (isCapture) {
            const chainCaptures = getPossibleMovesForPiece(toRow, toCol).captures;
            if (chainCaptures.length > 0) {
                selectedPiece = { row: toRow, col: toCol };
                mandatoryMoves = chainCaptures;
                drawBoard();
                updateScore();
                return;
            }
        }

        selectedPiece = null;
        switchPlayer();

        if (narrate) {
            const fromSquareStr = getSquareName(fromRow, fromCol);
            const toSquareStr = getSquareName(toRow, toCol);
            const nextPlayerName = (currentPlayer === BLACK_PIECE) ? 'Pretas' : 'Brancas';
            speak(`Movendo de ${fromSquareStr} para ${toSquareStr}. Vez das peças ${nextPlayerName}.`);
            updateStatus(false);
        } else {
            updateStatus(true);
        }

        updateScore();
        drawBoard();
    }

    function getSquareName(row, col) {
        const colChar = String.fromCharCode('A'.charCodeAt(0) + col);
        const rowNum = 8 - row;
        return `${colChar}${rowNum}`;
    }

    function isBlack(piece) {
        return piece === BLACK_PIECE || piece === BLACK_KING;
    }

    function isWhite(piece) {
        return piece === WHITE_PIECE || piece === WHITE_KING;
    }

    function playSound(sound) {
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(error => console.error("Erro ao tocar o som:", error));
        }
    }

    function isOnBoard(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    function isOpponent(piece, playerPiece) {
        return piece !== EMPTY && isBlack(playerPiece) !== isBlack(piece);
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === BLACK_PIECE) ? WHITE_PIECE : BLACK_PIECE;
        calculateTurnMoves();
    }

    function updateStatus(shouldSpeak = true) {
        const playerName = currentPlayer === BLACK_PIECE ? 'Pretas' : 'Brancas';
        statusDisplay.innerHTML = `Vez das peças <span class="highlight-turn">${playerName}</span>`;
        if (shouldSpeak) {
            const statusText = `Vez das peças ${playerName}`;
            speak(statusText);
        }
    }

    function updateScore() {
        let blackCount = 0;
        let whiteCount = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (isBlack(board[row][col])) {
                    blackCount++;
                } else if (isWhite(board[row][col])) {
                    whiteCount++;
                }
            }
        }

        const blackText = `Pretas: ${blackCount}`;
        const whiteText = `Brancas: ${whiteCount}`;
        if (currentPlayer === BLACK_PIECE) {
            scoreDisplay.innerHTML = `<span class="highlight-turn">${blackText}</span> - <span>${whiteText}</span>`;
        } else {
            scoreDisplay.innerHTML = `<span>${blackText}</span> - <span class="highlight-turn">${whiteText}</span>`;
        }

        if (whiteCount === 0) {
            statusDisplay.textContent = 'As Pretas Venceram!';
            canvas.removeEventListener('click', handleCanvasClick);
        } else if (blackCount === 0) {
            statusDisplay.textContent = 'As Brancas Venceram!';
            canvas.removeEventListener('click', handleCanvasClick);
        }
    }

    // --- INÍCIO DO JOGO ---

    canvas.addEventListener('click', handleCanvasClick);

    initializeBoard();
    speak('Bem-vindo ao Jogo de Damas Acessível! Como jogar. Use comandos de voz ou clique com o mouse para mover as peças. Para ativar o comando de voz, clique no botão Ativar comandos de voz ou pressione Barra de Espaço no teclado. Com o comando de voz ativado diga o nome da casa que deseja selecionar, por exemplo, F6. Para cancelar a seleção, diga cancelar. Hora de jogar!', () => {
        const playerName = currentPlayer === BLACK_PIECE ? 'Pretas' : 'Brancas';
        speak(`Vez das peças ${playerName}`);
    });
});
