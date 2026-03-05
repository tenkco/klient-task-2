//корневой компонент приложения
Vue.component('app', {
    template: `
        <div class="appContainer">
            <h1> Notes </h1>
            <div class="columns">
                <column 
                    :column-index="1"
                    :cards="cards.column1"
                    title="New"
                    :max-cards="3"
                    @progress-updated="handleProgressUpdate">
                </column>
                
                <column 
                    :column-index="2"
                    :cards="cards.column2"
                    title="In progress"
                    :max-cards="5"
                    @progress-updated="handleProgressUpdate">
                </column>
                
                <column 
                    :column-index="3"
                    :cards="cards.column3"
                    title="Ready"
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
    methods: {
        handleProgressUpdate(data) {
            console.log('Progress updated:', data)
        }
    }
})

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
})

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
})

//экземпляр Vue
let app = new Vue({
    el: '#app'
})