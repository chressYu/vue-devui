/**
 * 定义组件class
 */
 import { computed, ComputedRef } from 'vue';

 export const getRootClass = (): ComputedRef => {
   return computed(() => ({
     'devui-cascader-ul': true,
   }))
 }
 