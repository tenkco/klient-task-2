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
            }
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
        }
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
        card: Object,
        columnIndex: Number
    },
    template: `
        <div class="noteCard">
            <h3>{{ card.title || 'New note' }}</h3>
            <p class="placeholder">There will be tasks here,</p>
        </div>
    `
})

//экземпляр Vue
let app = new Vue({
    el: '#app'
})