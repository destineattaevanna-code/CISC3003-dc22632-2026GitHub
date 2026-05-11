// 行動版選單切換
window.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  toggle && toggle.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });

  // All Products 的排序示範（純前端視覺示範，非真實資料排序）
  const sort = document.getElementById('sort');
  if (sort) {
    sort.addEventListener('change', () => {
      // 作業不要求真的排序，這裡只示範一個提示
      console.log('Sort changed to:', sort.value);
      // 你可以擴充：根據 sort.value 重新排列 .card.product
    });
  }
});