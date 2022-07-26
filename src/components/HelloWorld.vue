<script setup lang="ts">
import { reactive } from 'vue'
import { User } from '@prisma/client';

defineProps<{ msg: string }>()

const rand = (length: number) => {
    let result = ''
    const characters = '0123456789ABCDEF'
    while (length > 0) {
      result += characters.charAt(Math.floor(Math.random() * 16))
      length -= 1
    }
    return result
}


const db = window.database
const users = reactive<User[]>([])
const loadUsers = async () => {
  const data = await db.users.findAll()
  users.splice(0)
  users.push(...data)
}
const addUser = async() => {
  await db.users.add({
    name: rand(8),
    email: rand(12),
    posts: {
      create: [
        { title: `title ${rand(10)}` }
      ],
    },
    profile: {
      create: { bio: `bio ${rand(4)}` }
    }
  })
  await loadUsers()
}
const deleteUsers = async() => {
  await db.users.deleteAll()
  await loadUsers()
}
loadUsers()
</script>

<template>
  <h1>{{ msg }}</h1>

  <p>
    Recommended IDE setup:
    <a href="https://code.visualstudio.com/" target="_blank">VS Code</a>
    +
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
  </p>

  <p>See <code>README.md</code> for more information.</p>

  <p>
    <a href="https://vitejs.dev/guide/features.html" target="_blank">
      Vite Docs
    </a>
    |
    <a href="https://v3.vuejs.org/" target="_blank">Vue 3 Docs</a>
    |
    <a href="https://www.prisma.io/docs/" target="_blank">Prisma Docs</a>
  </p>

  <button type="button" @click="addUser">Add User</button>
  <div v-for="user of users">
    {{ user }}
  </div>
  <button v-if="users.length > 0" type="button" @click="deleteUsers">Delete All Users</button>
</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
