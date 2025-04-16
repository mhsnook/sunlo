1. The new card selector uses its own kind of styles: `card.selected ? 'border-primary bg-primary/10' : ''`
   perhaps re-use the styles from the signup page or the deck options page?
   1. Actually please standardise this across these different kinds of selectors,
      and maybe even include the simple select and the highlighting its option elements.
      e.g. ``className={`option-all ${ el.selected ? 'option-selected' : 'option-unselected'}`}``
   1. Actually it might be nice to use this pattern for a bunch of shadcn things too... for
      daisy-style markup improvements / readability of the DOM, but it would make it more difficult
      to review updates to shadcn markup (we ignore most of them anyway, but mindfully)
