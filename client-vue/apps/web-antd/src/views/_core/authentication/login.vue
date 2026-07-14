<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => [
  {
    component: 'VbenInput',
    componentProps: {
      placeholder: '请输入手机号',
    },
    defaultValue: '13800000001',
    fieldName: 'phone',
    label: '手机号',
    rules: z.string().min(1, { message: '请输入手机号' }),
  },
  {
    component: 'VbenInputPassword',
    componentProps: {
      placeholder: '请输入密码',
    },
    defaultValue: '123456',
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(1, { message: '请输入密码' }),
  },
]);
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="authStore.authLogin"
  />
</template>
