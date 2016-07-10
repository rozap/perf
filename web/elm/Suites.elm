module Suites exposing (Model, Action, update, listView, singleView, model)
import Html exposing (..)
import Html.Attributes exposing (..)

type TimeUnit
  = Minute
  | Hour
  | Day
  | Week
  | Month

type alias TimeSpec =
  { every : Int
  , unit : TimeUnit
  }

type alias GitSpec =
  { url : String
  , branch : String
  }

type Trigger
  = Git GitSpec
  | Time TimeSpec

type alias Suite =
  { name : String
  , trigger: Trigger
  }

type alias Model = List Suite

type Action
  = Remove Suite
  | Add Suite
  | Edit Suite


model =
  [
  { name = "foo"
  , trigger = Time { every = 1, unit = Minute }
  }
  ,
  { name = "foo"
  , trigger = Git { url = "foobar", branch = "master" }
  }
  ]


specUnit : TimeUnit -> Int -> String
specUnit unit howMany =
  (case unit of
      Minute -> "minute"
      Hour -> "hour"
      Day -> "day"
      Week -> "week"
      Month -> "month") ++ (if howMany > 1 then "s" else "")

triggerView : Trigger -> Html Action
triggerView trigger =
  let
    descriptors = case trigger of
      Git spec ->
        [ span [ class "text-muted"] [ text "when branch " ]
        , span [] [ text spec.branch ]
        , span [ class "text-muted" ] [ text " on " ]
        , span [] [ text spec.url ]
        , span [ class "text-muted" ] [ text " is updated" ]
        ]
      Time spec ->
        [ span [ class "text-muted"] [ text "every " ]
        , span [] [ text (toString spec.every) ]
        , text " "
        , span [] [ text (specUnit spec.unit spec.every) ]
        ]
  in
    div [] descriptors


suiteView : Suite -> Html Action
suiteView suite =
  div []
      [ h3 [] [text suite.name]
      , triggerView suite.trigger
      ]



update : Action -> Model -> Model
update action model =
  model

listView : Model -> Html Action
listView model =
  div []
      [
      div [] [(text "hi")],
      div [] (List.map suiteView model)
      ]

singleView : Suite -> Html Action
singleView suite = text "iama sutie ama"