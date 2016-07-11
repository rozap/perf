module Suites exposing (Model, Suite, Action, update, listView, singleView, model)
import Html exposing (..)
import Html.Attributes exposing (..)
import Router
import Util

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
  , id: Int
  }

type alias Model = List Suite

type Action
  = Remove Suite
  | Add Suite
  | Edit Suite


model =
  [
  { name = "foo suite"
  , id = 1
  , trigger = Time { every = 1, unit = Minute }
  }
  ,
  { name = "bar suite"
  , id = 2
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
  div [ class "suite" ]
      [ a [ href (Router.pageToRoute (Router.SuitePage suite.id)) ] [text suite.name]
      , triggerView suite.trigger
      ]



update : Action -> Model -> Model
update action model =
  model

listView : Model -> Html Action
listView model =
  div [ class "suites" ]
      [
      div [] [(text "your suites")],
      div [] (List.map suiteView model)
      ]

singleView : Maybe Suite -> Html Action
singleView maybeSuite = 
  case maybeSuite of
    Just suite ->
      div [ class "suite" ]
        [ h2 [] [ text suite.name] ]
    Nothing -> 
      Util.loading