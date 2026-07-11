<template>
  <div>
    <!-- Non-visual contract hook for Nuxt Image static-raster e2e (issues #15 / #16). -->
    <AppImg
      class="sr-only"
      data-nuxt-image-contract
      src="/img/sweepy.png"
      alt=""
      width="1"
      height="1"
      aria-hidden="true"
    />
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
