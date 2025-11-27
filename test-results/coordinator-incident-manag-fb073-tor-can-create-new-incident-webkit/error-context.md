# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - navigation [ref=e7]:
        - button "previous" [disabled] [ref=e8]:
          - img "previous" [ref=e9]
        - button "next" [disabled] [ref=e11]:
          - img "next" [ref=e12]
        - generic [ref=e14]: 1 of 1 error
        - generic [ref=e15]:
          - text: Next.js (14.2.5) is outdated
          - link "(learn more)" [ref=e17]:
            - /url: https://nextjs.org/docs/messages/version-staleness
      - button "Close" [ref=e18] [cursor=pointer]:
        - img [ref=e20]
    - heading "Unhandled Runtime Error" [level=1] [ref=e23]
    - paragraph [ref=e24]: "Error: A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
```