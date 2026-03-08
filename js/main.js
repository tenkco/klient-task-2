//корневой компонент приложения
Vue.component('app', {
    template: `
        <div class="appContainer">
            <h1> Notes </h1>
            
            <create-card-form 
                :can-create="cards.column1.length < 3"
                :is-blocked="column1Blocked"
                @create-card="createCard">
            </create-card-form>
            
            <div class="columns">
                <column 
                    :column-index="1"
                    :cards="cards.column1"
                    title="New"
                    :max-cards="3"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate">
                </column>
                
                <column 
                    :column-index="2"
                    :cards="cards.column2"
                    title="In progress"
                    :max-cards="5"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate">
                </column>
                
                <column 
                    :column-index="3"
                    :cards="cards.column3"
                    title="Ready"
                    :is-column1-blocked="column1Blocked"
                    @progress-updated="handleProgressUpdate">
                </column>
            </div>
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
            } else {
                this.createTestData()
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
            <div class="cardsContainer">
                <note-card 
                    v-for="card in cards" 
                    :key="card.id"
                    :card="card"
                    :column-index="columnIndex"
                    @progress-updated="onProgressUpdated">
                </note-card>
            </div>
        </div>
    `,
    methods: {
        onProgressUpdated(data) {
            this.$emit('progress-updated', data)
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
        isColumn1Blocked: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <div class="noteCard" :class="{ 
            'completed': isCompleted,
            'blocked': isBlocked 
        }">
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
                               :disabled="isBlocked">
                        <span :class="{ 'completedText': item.completed }">
                            {{ item.text }}
                        </span>
                    </label>
                </li>
            </ul>
            
             <div v-if="isCompleted && card.completedAt" class="completedDate">
                Completed: {{ formatDate(card.completedAt) }}
            </div>
            
            <div v-if="isBlocked" class="blockedMessage">
                Editing is blocked
            </div>
            
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
        }
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
            <h2>Create a new note</h2>
            
            <div class="formGroup">
                <label for="cardTitle">Heading</label>
                <input type="text" 
                       id="cardTitle" 
                       v-model="localCard.title" 
                       placeholder="Enter a title for the note"
                       :disabled="isBlocked">
            </div>
            
            <div class="formGroup">
                <label>List items</label>
                <div v-for="(item, index) in localCard.items" 
                     :key="index" 
                     class="itemInput">
                    <input type="text" 
                           v-model="item.text" 
                           :placeholder="'Items ' + (index + 1)"
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
                        + Add item
                    </button>
                    <span class="hint">Add as many items as you need</span>
                </div>
            </div>
            
            <div class="formActions">
                <button type="button" 
                        @click="submitCard" 
                        :disabled="!isFormValid || !canCreate || isBlocked"
                        class="addButton">
                    Create a card
                </button>
                <span v-if="!isFormValid && !isBlocked" class="errorMessage">
                    Fill in the title and all the items
                </span>
                <span v-if="!canCreate && !isBlocked" class="errorMessage">
                    The first column is filled
                </span>
                <span v-if="isBlocked" class="errorMessage">
                    The column is blocked
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
            this.localCard.items.push({ text: '', completed: false })
        },
        removeItem(index) {
            if (this.localCard.items.length > 1) {
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

//экземпляр Vue
let app = new Vue({
    el: '#app'
});