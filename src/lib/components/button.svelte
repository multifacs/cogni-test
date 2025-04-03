<script lang="ts">
    let { color = 'green', children, onclick, disabled, type } = $props();
  </script>
  
  <button class="button" style="background-color: var(--button-{color});" onclick={onclick} disabled={disabled} type={type}>
    {@render children()}
  </button>
  
  <style>
    .button {
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s ease;
    }
  
    .button:hover {
      filter: brightness(85%);
    }

    .button:disabled {
      filter: brightness(85%);
      filter: contrast(85%);
    }
  </style>
  