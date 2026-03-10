//корневой компонент приложения
Vue.component('app', {
    template: `
        <div class="appContainer">
            <h1> Заметки </h1>
            
            <create-card-form 
                :can-create="cards.column1.length < 3"
                :is-blocked="column1Blocked"
                @create-card="createCard">
            </create-card-form>
            
            <div class="columns">
                <column 
                    :column-index="1"
                    :cards="cards.column1"
                    title="Новые"
                    :max-cards="3"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate"
                    @reorder-cards="reorderCards">
                </column>
                
                <column 
                    :column-index="2"
                    :cards="cards.column2"
                    title="В процессе"
                    :max-cards="5"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate"
                    @reorder-cards="reorderCards">
                </column>
                
                <column 
                    :column-index="3"
                    :cards="cards.column3"
                    title="Готово"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate"
                    @reorder-cards="reorderCards">
                </column>
            </div>
            
            <card-search :cards="allCards"></card-search>
        </div>
    `,
    data() {
        return {
            cards: {
                column1: [],
                column2: [],
                column3: []
            },
            nextId: 1,
            column1Blocked: false,
        }
    },

    computed: {
        allCards() {
            return [
                ...this.cards.column1.map(card => ({ ...card, status: 'Новые' })),
                ...this.cards.column2.map(card => ({ ...card, status: 'В процессе' })),
                ...this.cards.column3.map(card => ({ ...card, status: 'Готово' }))
            ]
        }
    },

    mounted() {
        this.loadFromStorage()
    },

    methods: {
        loadFromStorage() {
            const saved = localStorage.getItem('noteApp')
            if (saved) {
                const data = JSON.parse(saved)
                this.cards = data.cards || { column1: [], column2: [], column3: [] }
                this.nextId = data.nextId || this.getNextId()
                this.column1Blocked = data.column1Blocked || false
            }
        },

        saveToStorage() {
            const data = {
                cards: this.cards,
                nextId: this.nextId,
                column1Blocked: this.column1Blocked
            }
            localStorage.setItem('noteApp', JSON.stringify(data))
        },

        getNextId() {
            let maxId = 0
            for (let col in this.cards) {
                this.cards[col].forEach(card => {
                    if (card.id > maxId) maxId = card.id
                })
            }
            return maxId + 1
        },

        createCard(cardData) {
            if (this.cards.column1.length >= 3 || this.column1Blocked) return

            const newCard = {
                id: this.nextId++,
                ...cardData,
                completedAt: null
            }
            this.cards.column1.push(newCard)
            this.saveToStorage()
        },

        reorderCards(data) {
            const { columnKey, oldIndex, newIndex } = data
            const column = this.cards[columnKey]
            const [movedCard] = column.splice(oldIndex, 1)
            column.splice(newIndex, 0, movedCard)
            this.saveToStorage()
        },

        moveCard(cardId, fromColumn, toColumn, isComplete = false) {
            const fromCol = `column${fromColumn}`;
            const toCol = `column${toColumn}`;

            const cardIndex = this.cards[fromCol].findIndex(c => c.id === cardId)
            if (cardIndex === -1) return

            const [movedCard] = this.cards[fromCol].splice(cardIndex, 1)

            if (isComplete && !movedCard.completedAt) {
                movedCard.completedAt = new Date().toISOString()
            }

            this.cards[toCol].push(movedCard)
        },

        checkColumn1Blocked() {
            this.column1Blocked = this.cards.column2.length >= 5

            for (let i = this.cards.column2.length - 1; i >= 0; i--) {
                const card = this.cards.column2[i]
                const completedCount = card.items.filter(item => item.completed).length
                const progress = (completedCount / card.items.length) * 100

                if (progress === 100) {
                    const [movedCard] = this.cards.column2.splice(i, 1)
                    if (!movedCard.completedAt) {
                        movedCard.completedAt = new Date().toISOString()
                    }
                    this.cards.column3.push(movedCard)
                }
            }

            this.saveToStorage()
        },

        handleProgressUpdate(data) {
            const { cardId, progress, columnIndex } = data
            const sourceColumn = `column${columnIndex}`;
            const card = this.cards[sourceColumn].find(c => c.id === cardId)
            if (!card) return

            if (progress === 100) {
                if (columnIndex !== 3) {
                    this.moveCard(cardId, columnIndex, 3, true)
                }
            } else if (progress >= 50 && columnIndex === 1) {
                if (this.cards.column2.length < 5) {
                    this.moveCard(cardId, 1, 2)
                }
            }

            this.checkColumn1Blocked()
            this.saveToStorage()
        },

    }
});

//колонки
Vue.component('column', {
    props: {
        columnIndex: Number,
        cards: Array,
        title: String,
        maxCards: {
            type: Number,
            default: Infinity
        },
        isColumn1Blocked: Boolean,
    },
    template: `
        <div class="column" :class="'column-' + columnIndex">
            <div class="columHeader">
                <h2>{{ title }}</h2>
                <span class="cardCounter">{{ cards.length }}{{ maxCards !== Infinity ? '/' + maxCards : '' }}</span>
            </div>
            <div class="cardsContainer"
                @dragover.prevent
                @drop="onDrop">
                <note-card 
                    v-for="(card, index) in cards" 
                    :key="card.id"
                    :card="card"
                    :column-index="columnIndex"
                    :card-index="index"
                    :column-key="getColumnKey()"
                    :is-column1-blocked="isColumn1Blocked"
                    @progress-updated="onProgressUpdated">
                </note-card>
            </div>
        </div>
    `,
    methods: {
        onProgressUpdated(data) {
            this.$emit('progress-updated', data)
        },

        getColumnKey() {
            return `column${this.columnIndex}`
        },

        onDrop(event) {
            event.preventDefault()
            const dragData = JSON.parse(event.dataTransfer.getData('text/plain'))
            if (dragData.columnKey !== this.getColumnKey()) {
                return
            }

            const dropTarget = event.target.closest('.noteCard')
            let newIndex

            if (!dropTarget) {
                newIndex = this.cards.length
            } else {
                const targetCardId = Number(dropTarget.dataset.cardId)
                newIndex = this.cards.findIndex(c => c.id === targetCardId)
            }

            this.$emit('reorder-cards', {
                columnKey: this.getColumnKey(),
                oldIndex: dragData.sourceIndex,
                newIndex: newIndex
            })
        }
    }
});

//карточки
Vue.component('note-card', {
    props: {
        card: {
            type: Object,
            required: true
        },
        columnIndex: {
            type: Number,
            required: true
        },
        cardIndex: {
            type: Number,
            required: true
        },
        columnKey: {
            type: String,
            required: true
        },
        isColumn1Blocked: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <div class="noteCard" 
        :data-card-id="card.id"
        :class="{ 
            'completed': isCompleted,
            'blocked': isBlocked,
             'draggable': !isBlocked
        }"
        :draggable="!isBlocked"
        @dragstart="onDragStart"
        @dragend="onDragEnd">
            <div class="drag-handle" v-if="!isBlocked">:::</div>
            <h3>{{ card.title || 'New note' }}</h3>
            <p class="placeholder">There will be tasks here,</p>
            
            <div class="progressContainer">
                <div class="progressBar">
                    <div class="progressFill" 
                         :style="{ width: progressPercentage + '%' }"></div>
                </div>
                <span class="progressText">{{ progressPercentage }}%</span>
            </div>
            
            <ul class="tasksList">
                <li v-for="(item, index) in card.items" 
                    :key="index"
                    class="taskItem">
                    <label class="taskLabel">
                        <input type="checkbox" 
                               v-model="item.completed"
                               @change="updateProgress"
                               :disabled="isBlocked || item.completed">
                        <span :class="{ 'completedText': item.completed }">
                            {{ item.text }}
                        </span>
                    </label>
                </li>
            </ul>
            
             <div v-if="isCompleted && card.completedAt" class="completedDate">
                Completed: {{ formatDate(card.completedAt) }}
            </div>
            
            <div v-if="isBlocked" class="blockedMessage">Editing is blocked</div>
            
        </div>
    `,
    computed: {
        progressPercentage() {
            if (!this.card.items || this.card.items.length === 0) return 0
            const completed = this.card.items.filter(item => item.completed).length
            return Math.round((completed / this.card.items.length) * 100)
        },

        isCompleted() {
            return this.progressPercentage === 100
        },

        isBlocked() {
            return this.columnIndex === 1 && this.isColumn1Blocked
        }
    },

    methods: {
        updateProgress() {
            this.$emit('progress-updated', {
                cardId: this.card.id,
                progress: this.progressPercentage,
                columnIndex: this.columnIndex
            })
        },
        formatDate(dateString) {
            const date = new Date(dateString)
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        },

        onDragStart(event) {
            if (this.isBlocked) {
                event.preventDefault()
                return
            }

            const dragData = {
                cardId: this.card.id,
                sourceIndex: this.cardIndex,
                columnKey: this.columnKey
            }

            event.dataTransfer.setData('text/plain', JSON.stringify(dragData))
            event.dataTransfer.effectAllowed = 'move'
            event.target.classList.add('dragging')
        },

        onDragEnd(event) {
            event.target.classList.remove('dragging')
        },
    },
});

//форма создания карточки
Vue.component('create-card-form', {
    props: {
        canCreate: Boolean,
        isBlocked: Boolean
    },
    template: `
        <div class="createCardForm">
            <h2>Создать новую заметку</h2>
            
            <div class="formGroup">
                <label for="cardTitle">Заголовок</label>
                <input type="text" 
                       id="cardTitle" 
                       v-model="localCard.title" 
                       placeholder="Заголовок"
                       :disabled="isBlocked">
            </div>
            
            <div class="formGroup">
                <label>Список пунктов</label>
                <div v-for="(item, index) in localCard.items" 
                     :key="index" 
                     class="itemInput">
                    <input type="text" 
                           v-model="item.text" 
                           :placeholder="'Пункт '"
                           :disabled="isBlocked">
                    <button type="button" 
                            @click="removeItem(index)"
                            v-if="localCard.items.length > 1 && !isBlocked"
                            class="removeItem"> - </button>
                </div>
                
                <div class="itemControls" v-if="!isBlocked">
                    <button type="button" 
                            @click="addItem"
                            class="addItem">
                        + Добавить еще
                    </button>
                </div>
            </div>
            
            <div class="formActions">
                <button type="button" 
                        @click="submitCard" 
                        :disabled="!isFormValid || !canCreate || isBlocked"
                        class="addButton">
                    Создать карточку
                </button>
                <span v-if="!isFormValid && !isBlocked" class="errorMessage">
                    Заполните заголовок и все пункты
                </span>
                <span v-if="!canCreate && !isBlocked" class="errorMessage">
                    Первый столбец заполнен
                </span>
                <span v-if="isBlocked" class="errorMessage">
                    Колонка заблокирована
                </span>
            </div>
        </div>
    `,
    data() {
        return {

            localCard: {
                title: '',
                items: [
                    { text: '', completed: false },
                    { text: '', completed: false },
                    { text: '', completed: false },
                ]
            }
        }
    },
    computed: {
        isFormValid() {
            if (!this.localCard.title.trim()) return false
            for (let item of this.localCard.items) {
                if (!item.text.trim()) return false
            }
            return true
        }
    },
    methods: {
        addItem() {
            if (this.localCard.items.length >= 5) return
            this.localCard.items.push({ text: '', completed: false })
        },
        removeItem(index) {
            if (this.localCard.items.length > 3) {
                this.localCard.items.splice(index, 1)
            }
        },
        submitCard() {
            if (!this.isFormValid || !this.canCreate || this.isBlocked) return

            this.$emit('create-card', {
                title: this.localCard.title,
                items: this.localCard.items.map(item => ({
                    text: item.text,
                    completed: false
                }))
            })

            this.localCard = {
                title: '',
                items: [
                    { text: '', completed: false },
                    { text: '', completed: false },
                    { text: '', completed: false },
                ]
            }
        }
    }
});

//поиск
Vue.component('card-search', {
    props: {
        cards: {
            type: Array,
            required: true
        }
    },
    template: `
        <div class="search-container">
            <h2>Поиск заметок</h2>
            
            <div class="formGroup">
                <input 
                    type="text" 
                    v-model="searchQuery"
                    placeholder="Поиск"
                    class="itemInput"
                >
                <span v-if="searchQuery" @click="clearSearch">Close</span>
            </div>

            <div v-if="searchQuery">
                <h3>Результат поиска</h3>
                
                <div v-if="filteredCards.length === 0">
                    Не найдено
                </div>

                <div v-for="card in filteredCards" :key="card.id">
                    <div>
                        <h4>{{ card.title || 'Untitled' }}</h4>
                        <span :class="'status-' + card.status.toLowerCase().replace(' ', '-')">
                            {{ card.status }}
                        </span>
                    </div>

                    <div>
                        <div>
                            <div :style="{ width: getProgress(card) + '%' }">
                            </div>
                        </div>
                        <span>{{ getProgress(card) }}%</span>
                    </div>

                    <div>
                        <div v-for="(item, idx) in card.items" :key="idx">
                            <span :class="{ 'completed-task': item.completed }">
                                {{ item.text }}
                            </span>
                        </div>
                    </div>

                    <div>
                        <span>Сделано: {{ getCompletedCount(card) }}/{{ card.items.length }}</span>
                        <span v-if="card.completedAt">
                            Дата выполнения: {{ formatDate(card.completedAt) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            searchQuery: ''
        }
    },
    computed: {
        filteredCards() {
            if (!this.searchQuery.trim()) return []

            const query = this.searchQuery.toLowerCase().trim()
            return this.cards.filter(card =>
                card.title && card.title.toLowerCase().includes(query)
            )
        }
    },
    methods: {
        getProgress(card) {
            if (!card.items || card.items.length === 0) return 0
            const completed = card.items.filter(item => item.completed).length
            return Math.round((completed / card.items.length) * 100)
        },

        getCompletedCount(card) {
            return card.items.filter(item => item.completed).length
        },

        formatDate(dateString) {
            if (!dateString) return ''
            const date = new Date(dateString)
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        },

        clearSearch() {
            this.searchQuery = ''
        }
    }
});

//экземпляр Vue
let app = new Vue({
    el: '#app'
});